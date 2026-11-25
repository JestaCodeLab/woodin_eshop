<?php
/**
 * Plugin Name: Woodin email template
 * Description: One branded HTML email layout shared by the Woodin eshop emails (sign-in codes, order shipped, ready for collection, cancelled). Other mu-plugins call woodin_email_send(); if this file is missing they fall back to plain text.
 * Version: 1.0.0
 *
 * INSTALL: upload to wp-content/mu-plugins/ next to the other woodin-*.php files. Nothing to activate.
 *
 * SETTINGS (optional, in wp-config.php):
 *   define('WOODIN_SHOP_URL', 'https://www.woodinfashion.store');   // where the eshop lives. The logo, the buttons and the footer link use it.
 *
 * The logo is loaded from {WOODIN_SHOP_URL}/brand/woodin-logo-white.png, so the eshop must be public for it to show.
 * Email clients ignore most modern CSS, so everything here is tables and inline styles on purpose.
 */

if (!defined('ABSPATH')) {
    exit;
}

/** Eshop origin, no trailing slash. */
function woodin_email_shop_url()
{
    if (defined('WOODIN_SHOP_URL') && WOODIN_SHOP_URL) {
        return rtrim(WOODIN_SHOP_URL, '/');
    }
    if (defined('WOODIN_TRACK_URL') && WOODIN_TRACK_URL) { // older setting from woodin-order-tracking.php
        $p = wp_parse_url(WOODIN_TRACK_URL);
        if (!empty($p['scheme']) && !empty($p['host'])) {
            return $p['scheme'] . '://' . $p['host'];
        }
    }
    return 'https://www.woodinfashion.store';
}

// Brand colours (same tokens as the eshop).
const WOODIN_EMAIL_BROWN = '#521B0A';
const WOODIN_EMAIL_IVORY = '#F8F5EF';
const WOODIN_EMAIL_SAND  = '#EFE8DC';
const WOODIN_EMAIL_LINE  = '#E3DACB';
const WOODIN_EMAIL_INK   = '#1A120E';
const WOODIN_EMAIL_BODY  = '#3D332C';
const WOODIN_EMAIL_MUTED = '#5F554C';
const WOODIN_EMAIL_GOLD  = '#8A6115';

const WOODIN_EMAIL_SANS  = "'Jost','Helvetica Neue',Helvetica,Arial,sans-serif";
const WOODIN_EMAIL_SERIF = "'DM Serif Display',Georgia,'Times New Roman',serif";

/** A big, copy-friendly code box (sign-in codes). */
function woodin_email_code_box($code)
{
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0;"><tr>'
        . '<td align="center" style="background:#FFFFFF;border:1px solid ' . WOODIN_EMAIL_LINE . ';padding:22px 12px;">'
        . '<span style="font-family:' . WOODIN_EMAIL_SANS . ';font-size:38px;line-height:1;font-weight:500;letter-spacing:12px;color:' . WOODIN_EMAIL_BROWN . ';padding-left:12px;">'
        . esc_html($code) . '</span></td></tr></table>';
}

/** Label / value rows, e.g. Order number, Carrier. Empty values are skipped. */
function woodin_email_facts(array $rows)
{
    $out = '';
    foreach ($rows as $label => $value) {
        if ($value === '' || $value === null) {
            continue;
        }
        $out .= '<tr>'
            . '<td style="padding:12px 0;border-top:1px solid ' . WOODIN_EMAIL_LINE . ';font-family:' . WOODIN_EMAIL_SANS . ';font-size:12px;letter-spacing:2px;text-transform:uppercase;color:' . WOODIN_EMAIL_MUTED . ';width:42%;vertical-align:top;">' . esc_html($label) . '</td>'
            . '<td style="padding:12px 0;border-top:1px solid ' . WOODIN_EMAIL_LINE . ';font-family:' . WOODIN_EMAIL_SANS . ';font-size:15px;color:' . WOODIN_EMAIL_INK . ';vertical-align:top;">' . esc_html($value) . '</td>'
            . '</tr>';
    }
    if ($out === '') {
        return '';
    }
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 8px;border-bottom:1px solid ' . WOODIN_EMAIL_LINE . ';">' . $out . '</table>';
}

/** A short bulleted list of plain-text lines (welcome email). */
function woodin_email_list(array $lines)
{
    $out = '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 4px;">';
    foreach ($lines as $line) {
        $out .= '<tr><td width="22" valign="top" style="padding:0 0 12px;font-family:' . WOODIN_EMAIL_SANS . ';font-size:15px;line-height:1.5;color:' . WOODIN_EMAIL_BROWN . ';">&bull;</td>'
            . '<td style="padding:0 0 12px;font-family:' . WOODIN_EMAIL_SANS . ';font-size:15px;line-height:1.5;font-weight:300;color:' . WOODIN_EMAIL_BODY . ';">' . esc_html($line) . '</td></tr>';
    }
    return $out . '</table>';
}

/** "Item × qty" lines. $items = [ ['name' => ..., 'qty' => ...], ... ] */
function woodin_email_items(array $items)
{
    if (!$items) {
        return '';
    }
    $out = '<p style="margin:24px 0 8px;font-family:' . WOODIN_EMAIL_SANS . ';font-size:12px;letter-spacing:2px;text-transform:uppercase;color:' . WOODIN_EMAIL_MUTED . ';">In your order</p>';
    foreach ($items as $it) {
        $out .= '<p style="margin:0 0 6px;font-family:' . WOODIN_EMAIL_SANS . ';font-size:15px;line-height:1.5;color:' . WOODIN_EMAIL_INK . ';">'
            . esc_html($it['name']) . ' <span style="color:' . WOODIN_EMAIL_MUTED . ';">&times; ' . (int) $it['qty'] . '</span></p>';
    }
    return $out;
}

/**
 * Builds the HTML email.
 *   eyebrow   small gold label above the heading (optional)
 *   heading   the big title
 *   intro     one short paragraph (plain text)
 *   body_html extra HTML built with the helpers above (optional)
 *   button    ['label' => ..., 'url' => ...] (optional)
 *   outro     small closing paragraph (plain text, optional)
 *   preheader the grey preview text shown beside the subject in the inbox (optional)
 */
function woodin_email_html(array $a)
{
    $shop    = woodin_email_shop_url();
    $logo    = esc_url($shop . '/brand/woodin-logo-white.png');
    $sans    = WOODIN_EMAIL_SANS;
    $serif   = WOODIN_EMAIL_SERIF;
    $pre     = isset($a['preheader']) ? esc_html($a['preheader']) : '';
    $eyebrow = !empty($a['eyebrow']) ? '<p style="margin:0 0 12px;font-family:' . $sans . ';font-size:12px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:' . WOODIN_EMAIL_GOLD . ';">' . esc_html($a['eyebrow']) . '</p>' : '';
    $intro   = !empty($a['intro']) ? '<p style="margin:0;font-family:' . $sans . ';font-size:16px;line-height:1.65;font-weight:300;color:' . WOODIN_EMAIL_BODY . ';">' . nl2br(esc_html($a['intro'])) . '</p>' : '';
    $button  = '';
    if (!empty($a['button']['url'])) {
        $button = '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 8px;"><tr>'
            . '<td align="center" bgcolor="' . WOODIN_EMAIL_BROWN . '" style="background:' . WOODIN_EMAIL_BROWN . ';">'
            . '<a href="' . esc_url($a['button']['url']) . '" style="display:inline-block;padding:17px 34px;font-family:' . $sans . ';font-size:12px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:' . WOODIN_EMAIL_IVORY . ';text-decoration:none;">'
            . esc_html($a['button']['label']) . '</a></td></tr></table>';
    }
    $outro = !empty($a['outro']) ? '<p style="margin:24px 0 0;font-family:' . $sans . ';font-size:13px;line-height:1.6;font-weight:300;color:' . WOODIN_EMAIL_MUTED . ';">' . nl2br(esc_html($a['outro'])) . '</p>' : '';

    return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">'
        . '<title>' . esc_html($a['heading']) . '</title></head>'
        . '<body style="margin:0;padding:0;background:' . WOODIN_EMAIL_SAND . ';">'
        . '<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:' . WOODIN_EMAIL_SAND . ';">' . $pre . '&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>'
        . '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="' . WOODIN_EMAIL_SAND . '"><tr><td align="center" style="padding:28px 12px;">'
        . '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:100%;max-width:560px;background:' . WOODIN_EMAIL_IVORY . ';">'
        // Header band
        . '<tr><td align="center" bgcolor="' . WOODIN_EMAIL_BROWN . '" style="background:' . WOODIN_EMAIL_BROWN . ';padding:30px 24px;">'
        . '<a href="' . esc_url($shop) . '" style="text-decoration:none;"><img src="' . $logo . '" width="150" alt="Woodin" style="display:block;border:0;width:150px;max-width:100%;height:auto;font-family:' . $serif . ';font-size:28px;color:#FFFFFF;"></a>'
        . '</td></tr>'
        // Body
        . '<tr><td style="padding:44px 36px 40px;">'
        . $eyebrow
        . '<h1 style="margin:0 0 18px;font-family:' . $serif . ';font-size:32px;line-height:1.15;font-weight:400;color:' . WOODIN_EMAIL_BROWN . ';">' . esc_html($a['heading']) . '</h1>'
        . $intro
        . ($a['body_html'] ?? '')
        . $button
        . $outro
        . '</td></tr>'
        // Footer
        . '<tr><td style="padding:24px 36px 30px;border-top:1px solid ' . WOODIN_EMAIL_LINE . ';">'
        . '<p style="margin:0 0 6px;font-family:' . $serif . ';font-size:18px;color:' . WOODIN_EMAIL_BROWN . ';">Woodin</p>'
        . '<p style="margin:0;font-family:' . $sans . ';font-size:12px;line-height:1.7;font-weight:300;color:' . WOODIN_EMAIL_MUTED . ';">'
        . 'Woodin, Le créateur<br>'
        . '<a href="' . esc_url($shop) . '" style="color:' . WOODIN_EMAIL_MUTED . ';">' . esc_html(preg_replace('#^https?://#', '', $shop)) . '</a>'
        . '</p></td></tr>'
        . '</table></td></tr></table></body></html>';
}

/**
 * Sends one branded email: HTML for people, plain text underneath for clients that cannot show HTML
 * (and for spam filters, which like having both).
 */
function woodin_email_send($to, $subject, array $args, $plain)
{
    $alt = static function ($phpmailer) use ($plain) {
        $phpmailer->AltBody = $plain;
    };
    add_action('phpmailer_init', $alt);
    $sent = wp_mail($to, $subject, woodin_email_html($args), ['Content-Type: text/html; charset=UTF-8']);
    remove_action('phpmailer_init', $alt);
    return $sent;
}
