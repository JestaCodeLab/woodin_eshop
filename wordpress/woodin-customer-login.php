<?php
/**
 * Plugin Name: Woodin customer login
 * Description: Sign-in codes by email and rotating login sessions for the Woodin eshop. The eshop calls these private endpoints (all need the shared secret): /woodin/v1/login-code, login-verify, phone-code, phone-verify, session-create, session-refresh, session-check, session-list, session-revoke. Mail goes out through WordPress (wp_mail), so it uses whatever email setup the site already has.
 * Version: 2.2.0
 *
 * INSTALL
 *   1. Upload this file to wp-content/mu-plugins/ (same folder as woodin-order-tracking.php). Nothing to activate.
 *      Also upload woodin-email-template.php there, for the branded emails.
 *   2. In wp-config.php (above the "That's all, stop editing" line) add a long random secret:
 *        define('WOODIN_LOGIN_SECRET', 'paste-a-long-random-string-here');
 *      Put the SAME value in the eshop's WC_LOGIN_SECRET environment variable.
 *   3. Make sure the site can send email (a transactional SMTP plugin such as WP Mail SMTP is strongly recommended:
 *      plain PHP mail often lands in spam).
 *
 * SECURITY
 *   - Every endpoint refuses requests that do not carry the secret in the X-Woodin-Secret header.
 *   - Codes are stored hashed, expire after 10 minutes, are single use, and allow 5 wrong guesses (serialised with a
 *     database lock, so parallel guesses cannot beat the limit).
 *   - Codes are only ever emailed to people who can use them: a sign-in code goes to existing customers only, never to
 *     an unknown address and never to staff accounts. A registration code goes to the address being registered.
 *   - Send limits: once per 45 s per email, 8 per 10 min per visitor IP, 150 per hour for the whole site.
 *   - Phone verification texts (they cost SMS credit): 1 per minute per number, 5 per hour per account, 3 per hour per
 *     number, 10 per hour per IP, 100 per hour site-wide. Same code rules as email codes (hashed, 10 min, 5 tries).
 *   - Login sessions: the browser holds a short-lived access cookie (15 min) plus a refresh token. Only a hash of the
 *     refresh token is stored here. Every refresh issues a new token. Presenting an old token again (a sign it was copied)
 *     signs that device out. A refresh from a different browser/OS than the one that signed in is refused. A new-device
 *     sign-in sends the customer an email. Signing a device out takes effect immediately: the eshop checks the session
 *     here on every signed-in request (session-check), so a copied access cookie dies the moment its session is revoked.
 */

if (!defined('ABSPATH')) {
    exit;
}

const WOODIN_LOGIN_TTL = 600;          // seconds a code stays valid
const WOODIN_LOGIN_MAX_TRIES = 5;      // wrong guesses before the code is burned
const WOODIN_LOGIN_COOLDOWN = 45;      // seconds between codes for one email
const WOODIN_LOGIN_IP_MAX = 8;         // codes per visitor IP per 10 minutes
const WOODIN_LOGIN_GLOBAL_MAX = 150;   // codes for the whole site per hour

const WOODIN_PHONE_COOLDOWN = 60;      // seconds between texts to one number
const WOODIN_PHONE_CUSTOMER_MAX = 5;   // verification texts per account per hour
const WOODIN_PHONE_NUMBER_MAX = 3;     // verification texts to one number per hour, whichever accounts ask
const WOODIN_PHONE_IP_MAX = 10;        // verification texts per visitor IP per hour
const WOODIN_PHONE_GLOBAL_MAX = 100;   // verification texts for the whole site per hour (each one costs SMS credit)

const WOODIN_SESSION_MAX = 10;         // devices signed in at once, per customer
const WOODIN_REFRESH_IDLE = 2592000;   // 30 days: a refresh token unused this long dies
const WOODIN_SESSION_ABSOLUTE = 7776000; // 90 days: a device must sign in again after this, whatever
const WOODIN_REFRESH_GRACE = 20;       // seconds an old token is still accepted (parallel page loads race to refresh)

function woodin_login_authorised(WP_REST_Request $req)
{
    if (!defined('WOODIN_LOGIN_SECRET') || strlen(WOODIN_LOGIN_SECRET) < 20) {
        return new WP_Error('woodin_login_unconfigured', 'Login secret is not configured.', ['status' => 503]);
    }
    $given = (string) $req->get_header('x-woodin-secret');
    if (!hash_equals(WOODIN_LOGIN_SECRET, $given)) {
        return new WP_Error('woodin_login_forbidden', 'Forbidden.', ['status' => 403]);
    }
    return true;
}

function woodin_login_key($email)
{
    return 'woodin_login_' . md5(strtolower($email));
}

/** Named MySQL lock: makes read-modify-write on a transient or user meta safe against parallel requests. */
function woodin_login_lock($name)
{
    global $wpdb;
    return (bool) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 5)', 'woodin_' . md5($name)));
}

function woodin_login_unlock($name)
{
    global $wpdb;
    $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', 'woodin_' . md5($name)));
}

/** Counts one hit against $key; returns false once more than $max hits landed within $window seconds. */
function woodin_login_allow($key, $max, $window)
{
    $row = get_transient($key);
    $n = is_array($row) ? (int) $row['n'] : 0;
    $started = is_array($row) ? (int) $row['t'] : time();
    if ($n >= $max) {
        return false;
    }
    set_transient($key, ['n' => $n + 1, 't' => $started], max(1, $window - (time() - $started)));
    return true;
}

/**
 * The shop customer for an email: the WP_User, null when there is no such user, false when the address belongs to
 * staff (administrator, shop manager, editor...). Staff never get a shop code or session.
 */
function woodin_customer_by_email($email)
{
    $u = get_user_by('email', $email);
    if (!$u) {
        return null;
    }
    return in_array('customer', (array) $u->roles, true) && count($u->roles) === 1 ? $u : false;
}

function woodin_customer_by_id($id)
{
    $u = get_userdata((int) $id);
    return ($u && in_array('customer', (array) $u->roles, true) && count($u->roles) === 1) ? $u : null;
}

/** Sends a branded email when woodin-email-template.php is installed, plain text otherwise. */
function woodin_login_mail($to, $subject, array $args, $plain)
{
    if (function_exists('woodin_email_send')) {
        return woodin_email_send($to, $subject, $args, $plain);
    }
    return wp_mail($to, $subject, $plain);
}

// ---------------------------------------------------------------------------------------------------------------
// Sessions (stored as user meta "woodin_sessions": a list of devices)
// ---------------------------------------------------------------------------------------------------------------

function woodin_token_hash($secret)
{
    return hash_hmac('sha256', (string) $secret, wp_salt('auth'));
}

function woodin_sessions_get($cid)
{
    $raw = get_user_meta($cid, 'woodin_sessions', true);
    $list = is_array($raw) ? $raw : [];
    $now = time();
    // Drop devices that are idle or too old.
    return array_values(array_filter($list, function ($s) use ($now) {
        return isset($s['rotated'], $s['created']) && ($now - (int) $s['rotated']) < WOODIN_REFRESH_IDLE && ($now - (int) $s['created']) < WOODIN_SESSION_ABSOLUTE;
    }));
}

function woodin_sessions_save($cid, array $list)
{
    update_user_meta($cid, 'woodin_sessions', array_values($list));
}

function woodin_new_secret()
{
    return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
}

/** "<customer id>.<session id>.<secret>" -> [cid, sid, secret] or null. */
function woodin_parse_refresh($token)
{
    if (!preg_match('/^(\d{1,10})\.([a-f0-9]{12})\.([A-Za-z0-9_-]{40,60})$/', (string) $token, $m)) {
        return null;
    }
    return [(int) $m[1], $m[2], $m[3]];
}

function woodin_sess_text($v, $max)
{
    return substr(sanitize_text_field((string) $v), 0, $max);
}

add_action('rest_api_init', function () {
    $auth = 'woodin_login_authorised';

    // -------------------------------------------------------------------------------------------------------
    // Codes
    // -------------------------------------------------------------------------------------------------------
    register_rest_route('woodin/v1', '/login-code', [
        'methods'             => 'POST',
        'permission_callback' => $auth,
        'callback'            => function (WP_REST_Request $req) {
            $email = sanitize_email((string) $req->get_param('email'));
            if (!is_email($email)) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'invalid_email'], 400);
            }
            $register = $req->get_param('purpose') === 'register';
            $key = woodin_login_key($email);
            $ip = filter_var((string) $req->get_param('ip'), FILTER_VALIDATE_IP) ?: 'unknown';

            if (!woodin_login_lock('throttle')) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'busy'], 503);
            }
            try {
                if (!woodin_login_allow('woodin_loginip_' . md5($ip), WOODIN_LOGIN_IP_MAX, 600)
                    || !woodin_login_allow('woodin_login_global', WOODIN_LOGIN_GLOBAL_MAX, 3600)) {
                    return new WP_REST_Response(['ok' => false, 'reason' => 'too_soon'], 429);
                }

                // Who may receive a code. Same answer to the caller either way, so nobody can use this to find
                // out which emails have an account.
                $customer = woodin_customer_by_email($email);
                $mayReceive = $register ? ($customer !== false) : ($customer instanceof WP_User);
                if (!$mayReceive) {
                    return new WP_REST_Response(['ok' => true, 'sent' => false], 200);
                }

                $existing = get_transient($key);
                if (is_array($existing) && time() - (int) $existing['sent'] < WOODIN_LOGIN_COOLDOWN) {
                    return new WP_REST_Response(['ok' => true, 'sent' => false], 200);
                }

                $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
                set_transient($key, [
                    'hash'  => wp_hash_password($code),
                    'tries' => 0,
                    'sent'  => time(),
                ], WOODIN_LOGIN_TTL);
            } finally {
                woodin_login_unlock('throttle');
            }

            $site = wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES);
            if ($register && !($customer instanceof WP_User)) {
                $subject = sprintf('Confirm your email for %s: %s', $site, $code);
                $heading = 'Confirm your email';
                $eyebrow = 'Create your account';
                $intro = 'Enter this code on the Woodin shop to finish creating your account. It works once and expires in 10 minutes.';
            } else {
                $subject = sprintf('Your %s sign-in code: %s', $site, $code);
                $heading = 'Your sign-in code';
                $eyebrow = 'Sign in';
                $intro = 'Enter this code on the Woodin shop to sign in. It works once and expires in 10 minutes.';
            }
            $plain = "{$heading}: {$code}\n\n"
                . "It expires in 10 minutes. If you did not ask for it, you can ignore this email.\n\n"
                . "Never share this code with anyone. Woodin will never ask you for it, by phone, WhatsApp or email.\n";
            $sent = woodin_login_mail($email, $subject, [
                'preheader' => "Your Woodin code is {$code}. It expires in 10 minutes.",
                'eyebrow'   => $eyebrow,
                'heading'   => $heading,
                'intro'     => $intro,
                'body_html' => function_exists('woodin_email_code_box') ? woodin_email_code_box($code) : '',
                'outro'     => "Did not ask for this? You can safely ignore this email: nobody can sign in without the code.\nNever share this code. Woodin will never ask you for it, by phone, WhatsApp or email. Anyone who does is trying to take over your account.",
            ], $plain);

            if (!$sent) {
                delete_transient($key);
                error_log('[woodin-login] wp_mail failed for a sign-in code');
            }
            return new WP_REST_Response(['ok' => true, 'sent' => (bool) $sent], 200);
        },
    ]);

    register_rest_route('woodin/v1', '/login-verify', [
        'methods'             => 'POST',
        'permission_callback' => $auth,
        'callback'            => function (WP_REST_Request $req) {
            $email = sanitize_email((string) $req->get_param('email'));
            $code  = preg_replace('/\D/', '', (string) $req->get_param('code'));
            if (!is_email($email) || strlen($code) !== 6) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'invalid'], 400);
            }
            $key = woodin_login_key($email);

            // One guess at a time per email: the try counter must be read, bumped and saved without
            // another request sneaking in between, or parallel guesses would beat the limit.
            if (!woodin_login_lock($key)) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'busy'], 503);
            }
            try {
                $row = get_transient($key);
                if (!is_array($row)) {
                    return new WP_REST_Response(['ok' => false, 'reason' => 'expired'], 200);
                }
                if ((int) $row['tries'] >= WOODIN_LOGIN_MAX_TRIES) {
                    delete_transient($key);
                    return new WP_REST_Response(['ok' => false, 'reason' => 'locked'], 200);
                }
                // Count the guess BEFORE checking it, so a crash or timeout never gives a free try.
                $row['tries'] = (int) $row['tries'] + 1;
                $remaining = max(1, WOODIN_LOGIN_TTL - (time() - (int) $row['sent']));
                set_transient($key, $row, $remaining);

                if (!wp_check_password($code, $row['hash'])) {
                    return new WP_REST_Response(['ok' => false, 'reason' => 'wrong'], 200);
                }
                delete_transient($key); // single use
                return new WP_REST_Response(['ok' => true], 200);
            } finally {
                woodin_login_unlock($key);
            }
        },
    ]);

    // -------------------------------------------------------------------------------------------------------
    // Phone verification. WordPress makes, stores (hashed) and checks the code; the eshop sends the text
    // (FlockText) and tells us which number to verify. The number always comes from the customer's own
    // account record on the eshop side, never from the browser.
    // -------------------------------------------------------------------------------------------------------
    register_rest_route('woodin/v1', '/phone-code', [
        'methods'             => 'POST',
        'permission_callback' => $auth,
        'callback'            => function (WP_REST_Request $req) {
            $cid = (int) $req->get_param('customer_id');
            $phone = preg_replace('/[^\d+]/', '', (string) $req->get_param('phone'));
            if (!woodin_customer_by_id($cid)) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'not_customer'], 403);
            }
            if (!preg_match('/^\+233\d{9}$/', $phone)) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'invalid_phone'], 400);
            }
            $ip = filter_var((string) $req->get_param('ip'), FILTER_VALIDATE_IP) ?: 'unknown';
            $key = 'woodin_phone_' . md5($cid . '|' . $phone);

            if (!woodin_login_lock('phone_throttle')) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'busy'], 503);
            }
            try {
                $existing = get_transient($key);
                if (is_array($existing) && time() - (int) $existing['sent'] < WOODIN_PHONE_COOLDOWN) {
                    return new WP_REST_Response(['ok' => false, 'reason' => 'too_soon'], 429);
                }
                if (!woodin_login_allow('woodin_phonecust_' . $cid, WOODIN_PHONE_CUSTOMER_MAX, 3600)
                    || !woodin_login_allow('woodin_phonenum_' . md5($phone), WOODIN_PHONE_NUMBER_MAX, 3600)
                    || !woodin_login_allow('woodin_phoneip_' . md5($ip), WOODIN_PHONE_IP_MAX, 3600)
                    || !woodin_login_allow('woodin_phone_global', WOODIN_PHONE_GLOBAL_MAX, 3600)) {
                    return new WP_REST_Response(['ok' => false, 'reason' => 'too_soon'], 429);
                }
                $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
                set_transient($key, ['hash' => wp_hash_password($code), 'tries' => 0, 'sent' => time()], WOODIN_LOGIN_TTL);
            } finally {
                woodin_login_unlock('phone_throttle');
            }
            // The eshop texts this to the number. It is returned over the authenticated server-to-server call only.
            return new WP_REST_Response(['ok' => true, 'code' => $code], 200);
        },
    ]);

    register_rest_route('woodin/v1', '/phone-verify', [
        'methods'             => 'POST',
        'permission_callback' => $auth,
        'callback'            => function (WP_REST_Request $req) {
            $cid = (int) $req->get_param('customer_id');
            $phone = preg_replace('/[^\d+]/', '', (string) $req->get_param('phone'));
            $code = preg_replace('/\D/', '', (string) $req->get_param('code'));
            if (!woodin_customer_by_id($cid) || !preg_match('/^\+233\d{9}$/', $phone) || strlen($code) !== 6) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'invalid'], 400);
            }
            $key = 'woodin_phone_' . md5($cid . '|' . $phone);

            if (!woodin_login_lock($key)) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'busy'], 503);
            }
            try {
                $row = get_transient($key);
                if (!is_array($row)) {
                    return new WP_REST_Response(['ok' => false, 'reason' => 'expired'], 200);
                }
                if ((int) $row['tries'] >= WOODIN_LOGIN_MAX_TRIES) {
                    delete_transient($key);
                    return new WP_REST_Response(['ok' => false, 'reason' => 'locked'], 200);
                }
                $row['tries'] = (int) $row['tries'] + 1; // counted BEFORE the check
                set_transient($key, $row, max(1, WOODIN_LOGIN_TTL - (time() - (int) $row['sent'])));
                if (!wp_check_password($code, $row['hash'])) {
                    return new WP_REST_Response(['ok' => false, 'reason' => 'wrong'], 200);
                }
                delete_transient($key); // single use
                return new WP_REST_Response(['ok' => true], 200);
            } finally {
                woodin_login_unlock($key);
            }
        },
    ]);

    // -------------------------------------------------------------------------------------------------------
    // Sessions
    // -------------------------------------------------------------------------------------------------------

    // Called once, right after a code was verified. Returns the refresh token (shown to the browser only once).
    register_rest_route('woodin/v1', '/session-create', [
        'methods'             => 'POST',
        'permission_callback' => $auth,
        'callback'            => function (WP_REST_Request $req) {
            $cid = (int) $req->get_param('customer_id');
            $user = woodin_customer_by_id($cid);
            if (!$user) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'not_customer'], 403);
            }
            $coarse = woodin_sess_text($req->get_param('ua_coarse'), 60);
            $label  = woodin_sess_text($req->get_param('ua_label'), 80);
            $ip     = woodin_sess_text($req->get_param('ip'), 45);
            $notify = filter_var($req->get_param('notify'), FILTER_VALIDATE_BOOLEAN);
            $welcome = filter_var($req->get_param('welcome'), FILTER_VALIDATE_BOOLEAN);

            if (!woodin_login_lock('sess_' . $cid)) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'busy'], 503);
            }
            try {
                $list = woodin_sessions_get($cid);
                $hadAny = count($list) > 0;
                $seenDevice = false;
                foreach ($list as $s) {
                    if (($s['ua_coarse'] ?? '') === $coarse) {
                        $seenDevice = true;
                    }
                }

                $sid = bin2hex(random_bytes(6));
                $secret = woodin_new_secret();
                $now = time();
                $list[] = [
                    'sid' => $sid, 'hash' => woodin_token_hash($secret), 'prev' => '', 'prev_at' => 0,
                    'created' => $now, 'rotated' => $now, 'last_used' => $now,
                    'ua_coarse' => $coarse, 'label' => $label, 'ip' => $ip,
                ];
                if (count($list) > WOODIN_SESSION_MAX) {
                    usort($list, function ($a, $b) { return ($a['last_used'] ?? 0) <=> ($b['last_used'] ?? 0); });
                    $list = array_slice($list, count($list) - WOODIN_SESSION_MAX);
                }
                woodin_sessions_save($cid, $list);
            } finally {
                woodin_login_unlock('sess_' . $cid);
            }

            // Tell the customer about a sign-in from a browser/device they have not used before.
            if ($notify && $hadAny && !$seenDevice) {
                $shop = function_exists('woodin_email_shop_url') ? woodin_email_shop_url() : home_url();
                $when = wp_date('j M Y, H:i', time(), new DateTimeZone('Africa/Accra')) . ' (Accra time)';
                $plain = "Your Woodin account was signed in on a new device: {$label}, {$when}.\n\n"
                    . "If this was you, nothing to do. If it was not, sign out of all devices: {$shop}/account/security\n";
                woodin_login_mail($user->user_email, 'New sign-in to your Woodin account', [
                    'preheader' => "New sign-in: {$label}",
                    'eyebrow'   => 'Account security',
                    'heading'   => 'New sign-in to your account',
                    'intro'     => 'Your Woodin account was just signed in on a device we have not seen before.',
                    'body_html' => function_exists('woodin_email_facts') ? woodin_email_facts(['Device' => $label, 'When' => $when]) : '',
                    'button'    => ['label' => 'Review your devices', 'url' => $shop . '/account/security'],
                    'outro'     => 'If this was you, there is nothing to do. If it was not, open the page above and sign out of all devices.',
                ], $plain);
            }

            // Welcome email: once, when the eshop says this sign-in just created the account.
            if ($welcome && !get_user_meta($cid, 'woodin_welcome_sent', true)) {
                update_user_meta($cid, 'woodin_welcome_sent', time());
                $shop = function_exists('woodin_email_shop_url') ? woodin_email_shop_url() : home_url();
                $first = trim((string) $user->first_name) ?: 'there';
                $plain = "Welcome to Woodin, {$first}. Your account is ready.\n\n"
                    . "With it you can follow every order with Ghana Post tracking, keep your favourites on any device and check out faster with saved details.\n\n"
                    . "Start shopping: {$shop}/shop\n\nYou sign in with a code we email you, so there is no password to remember.\n";
                woodin_login_mail($user->user_email, 'Welcome to Woodin', [
                    'preheader' => 'Your Woodin account is ready.',
                    'eyebrow'   => 'Welcome',
                    'heading'   => "Welcome to Woodin, {$first}",
                    'intro'     => 'Your account is ready. Here is what you can do with it:',
                    'body_html' => function_exists('woodin_email_list') ? woodin_email_list([
                        'Follow every order, with Ghana Post tracking',
                        'Keep your favourites on any device',
                        'Check out faster with your saved details',
                    ]) : '',
                    'button'    => ['label' => 'Start shopping', 'url' => $shop . '/shop'],
                    'outro'     => 'You sign in with a code we email you, so there is no password to remember. Questions? Just reply to this email.',
                ], $plain);
            }
            return new WP_REST_Response(['ok' => true, 'sid' => $sid, 'refresh' => $cid . '.' . $sid . '.' . $secret], 200);
        },
    ]);

    // Swaps a refresh token for a new one. Detects copied tokens and device changes.
    register_rest_route('woodin/v1', '/session-refresh', [
        'methods'             => 'POST',
        'permission_callback' => $auth,
        'callback'            => function (WP_REST_Request $req) {
            $parts = woodin_parse_refresh($req->get_param('refresh'));
            if (!$parts) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'invalid'], 200);
            }
            [$cid, $sid, $secret] = $parts;
            $coarse = woodin_sess_text($req->get_param('ua_coarse'), 60);

            if (!woodin_login_lock('sess_' . $cid)) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'busy'], 503);
            }
            try {
                $user = woodin_customer_by_id($cid);
                $list = woodin_sessions_get($cid);
                $idx = null;
                foreach ($list as $i => $s) {
                    if (hash_equals((string) $s['sid'], $sid)) {
                        $idx = $i;
                    }
                }
                if (!$user || $idx === null) {
                    return new WP_REST_Response(['ok' => false, 'reason' => 'invalid'], 200);
                }
                $s = $list[$idx];
                $now = time();
                $given = woodin_token_hash($secret);

                // A different browser or OS than the one that signed in: this token was copied. End the session.
                if (($s['ua_coarse'] ?? '') !== '' && $coarse !== '' && $s['ua_coarse'] !== $coarse) {
                    unset($list[$idx]);
                    woodin_sessions_save($cid, $list);
                    return new WP_REST_Response(['ok' => false, 'reason' => 'device_changed'], 200);
                }

                if (hash_equals((string) $s['hash'], $given)) {
                    $new = woodin_new_secret();
                    $list[$idx]['prev'] = $s['hash'];
                    $list[$idx]['prev_at'] = $now;
                    $list[$idx]['hash'] = woodin_token_hash($new);
                    $list[$idx]['rotated'] = $now;
                    $list[$idx]['last_used'] = $now;
                    woodin_sessions_save($cid, $list);
                    return new WP_REST_Response([
                        'ok' => true, 'rotated' => true, 'customer_id' => $cid, 'email' => $user->user_email, 'sid' => $sid,
                        'refresh' => $cid . '.' . $sid . '.' . $new,
                    ], 200);
                }

                // The token the browser used a moment ago: several page loads can race to refresh at once.
                // Accept it briefly, without issuing another new token (the winner's response carries it).
                if (!empty($s['prev']) && hash_equals((string) $s['prev'], $given) && ($now - (int) $s['prev_at']) <= WOODIN_REFRESH_GRACE) {
                    $list[$idx]['last_used'] = $now;
                    woodin_sessions_save($cid, $list);
                    return new WP_REST_Response(['ok' => true, 'rotated' => false, 'customer_id' => $cid, 'email' => $user->user_email, 'sid' => $sid], 200);
                }

                // An old token used long after it was replaced, or a wrong secret: assume it was copied.
                unset($list[$idx]);
                woodin_sessions_save($cid, $list);
                return new WP_REST_Response(['ok' => false, 'reason' => 'reuse'], 200);
            } finally {
                woodin_login_unlock('sess_' . $cid);
            }
        },
    ]);

    // Read-only and cheap: is this device's session still alive? The eshop asks on every signed-in request, so a
    // sign-out (or "sign out other devices") takes effect at once instead of when the 15-minute cookie runs out.
    register_rest_route('woodin/v1', '/session-check', [
        'methods'             => 'POST',
        'permission_callback' => $auth,
        'callback'            => function (WP_REST_Request $req) {
            $cid = (int) $req->get_param('customer_id');
            $sid = preg_replace('/[^a-f0-9]/', '', (string) $req->get_param('sid'));
            if ($cid < 1 || strlen($sid) !== 12 || !woodin_customer_by_id($cid)) {
                return new WP_REST_Response(['ok' => true, 'active' => false], 200);
            }
            foreach (woodin_sessions_get($cid) as $s) {
                if (hash_equals((string) $s['sid'], $sid)) {
                    return new WP_REST_Response(['ok' => true, 'active' => true], 200);
                }
            }
            return new WP_REST_Response(['ok' => true, 'active' => false], 200);
        },
    ]);

    register_rest_route('woodin/v1', '/session-list', [
        'methods'             => 'POST',
        'permission_callback' => $auth,
        'callback'            => function (WP_REST_Request $req) {
            $cid = (int) $req->get_param('customer_id');
            if (!woodin_customer_by_id($cid)) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'not_customer'], 403);
            }
            $out = array_map(function ($s) {
                return [
                    'sid' => $s['sid'], 'label' => $s['label'] ?? '', 'ip' => $s['ip'] ?? '',
                    'created' => (int) $s['created'], 'last_used' => (int) ($s['last_used'] ?? $s['created']),
                ];
            }, woodin_sessions_get($cid));
            return new WP_REST_Response(['ok' => true, 'sessions' => $out], 200);
        },
    ]);

    // Ends one device (sid), every device except one (except_sid), or all of them. A refresh token can stand in for
    // customer_id + sid, so signing out works even after the access cookie has expired.
    register_rest_route('woodin/v1', '/session-revoke', [
        'methods'             => 'POST',
        'permission_callback' => $auth,
        'callback'            => function (WP_REST_Request $req) {
            $sid = '';
            $cid = (int) $req->get_param('customer_id');
            $parts = woodin_parse_refresh($req->get_param('refresh'));
            if ($parts) {
                [$cid, $sid] = $parts;
            } elseif ($req->get_param('sid')) {
                $sid = preg_replace('/[^a-f0-9]/', '', (string) $req->get_param('sid'));
            }
            $except = preg_replace('/[^a-f0-9]/', '', (string) $req->get_param('except_sid'));
            $all = filter_var($req->get_param('all'), FILTER_VALIDATE_BOOLEAN);
            if ($cid < 1) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'invalid'], 400);
            }

            if (!woodin_login_lock('sess_' . $cid)) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'busy'], 503);
            }
            try {
                $list = woodin_sessions_get($cid);
                $kept = array_values(array_filter($list, function ($s) use ($sid, $except, $all) {
                    if ($all) {
                        return false;
                    }
                    if ($except !== '') {
                        return hash_equals((string) $s['sid'], $except);
                    }
                    return $sid === '' || !hash_equals((string) $s['sid'], $sid);
                }));
                woodin_sessions_save($cid, $kept);
                return new WP_REST_Response(['ok' => true, 'removed' => count($list) - count($kept)], 200);
            } finally {
                woodin_login_unlock('sess_' . $cid);
            }
        },
    ]);
});
