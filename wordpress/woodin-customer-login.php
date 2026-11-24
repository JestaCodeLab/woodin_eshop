<?php
/**
 * Plugin Name: Woodin customer login codes
 * Description: Lets the Woodin eshop sign customers in with a 6-digit code sent by email. The eshop calls two private endpoints: /woodin/v1/login-code (sends the code) and /woodin/v1/login-verify (checks it). Mail goes out through WordPress (wp_mail), so it uses whatever email setup the site already has.
 * Version: 1.0.0
 *
 * INSTALL
 *   1. Upload this file to wp-content/mu-plugins/ (same folder as woodin-order-tracking.php). Nothing to activate.
 *   2. In wp-config.php (above the "That's all, stop editing" line) add a long random secret:
 *        define('WOODIN_LOGIN_SECRET', 'paste-a-long-random-string-here');
 *      Put the SAME value in the eshop's WC_LOGIN_SECRET environment variable.
 *   3. Make sure the site can send email (a transactional SMTP plugin such as WP Mail SMTP is strongly recommended:
 *      plain PHP mail often lands in spam).
 *
 * SECURITY
 *   - Both endpoints refuse every request that does not carry the secret in the X-Woodin-Secret header.
 *   - Codes are stored hashed, expire after 10 minutes, are single use, and allow 5 wrong guesses.
 *   - A new code can be requested at most once every 45 seconds per email address, 8 per 10 minutes per visitor IP
 *     (the eshop passes the IP) and 150 per hour for the whole site, so the form cannot be used to flood someone's
 *     inbox or to damage the site's email reputation.
 *   - Guess counting is serialised with a database lock, so 50 parallel guesses cannot beat the 5-try limit.
 */

if (!defined('ABSPATH')) {
    exit;
}

const WOODIN_LOGIN_TTL = 600;        // seconds a code stays valid
const WOODIN_LOGIN_MAX_TRIES = 5;    // wrong guesses before the code is burned
const WOODIN_LOGIN_COOLDOWN = 45;    // seconds between codes for one email
const WOODIN_LOGIN_IP_MAX = 8;       // codes per visitor IP per 10 minutes
const WOODIN_LOGIN_GLOBAL_MAX = 150; // codes for the whole site per hour

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

/** Named MySQL lock: makes read-modify-write on a transient safe against parallel requests. */
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

add_action('rest_api_init', function () {
    register_rest_route('woodin/v1', '/login-code', [
        'methods'             => 'POST',
        'permission_callback' => 'woodin_login_authorised',
        'callback'            => function (WP_REST_Request $req) {
            $email = sanitize_email((string) $req->get_param('email'));
            if (!is_email($email)) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'invalid_email'], 400);
            }
            $key = woodin_login_key($email);
            $ip = filter_var((string) $req->get_param('ip'), FILTER_VALIDATE_IP) ?: 'unknown';

            if (!woodin_login_lock('throttle')) {
                return new WP_REST_Response(['ok' => false, 'reason' => 'busy'], 503);
            }
            try {
                $existing = get_transient($key);
                if (is_array($existing) && time() - (int) $existing['sent'] < WOODIN_LOGIN_COOLDOWN) {
                    return new WP_REST_Response(['ok' => false, 'reason' => 'too_soon'], 429);
                }
                if (!woodin_login_allow('woodin_loginip_' . md5($ip), WOODIN_LOGIN_IP_MAX, 600)
                    || !woodin_login_allow('woodin_login_global', WOODIN_LOGIN_GLOBAL_MAX, 3600)) {
                    return new WP_REST_Response(['ok' => false, 'reason' => 'too_soon'], 429);
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
            $subject = sprintf('Your %s sign-in code: %s', $site, $code);
            $plain = "Your sign-in code is: {$code}\n\n"
                . "It expires in 10 minutes. If you did not ask for it, you can ignore this email.\n\n"
                . "Never share this code with anyone.\n";
            if (function_exists('woodin_email_send')) { // branded HTML (woodin-email-template.php)
                $sent = woodin_email_send($email, $subject, [
                    'preheader' => "Your Woodin sign-in code is {$code}. It expires in 10 minutes.",
                    'eyebrow'   => 'Sign in',
                    'heading'   => 'Your sign-in code',
                    'intro'     => 'Enter this code on the Woodin shop to sign in. It works once and expires in 10 minutes.',
                    'body_html' => woodin_email_code_box($code),
                    'outro'     => "Did not ask for this? You can safely ignore this email: nobody can sign in without the code.\nNever share this code with anyone. Woodin will never ask you for it.",
                ], $plain);
            } else {
                $sent = wp_mail($email, $subject, $plain);
            }

            if (!$sent) {
                delete_transient($key);
                return new WP_REST_Response(['ok' => false, 'reason' => 'mail_failed'], 502);
            }
            return new WP_REST_Response(['ok' => true], 200);
        },
    ]);

    register_rest_route('woodin/v1', '/login-verify', [
        'methods'             => 'POST',
        'permission_callback' => 'woodin_login_authorised',
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
});
