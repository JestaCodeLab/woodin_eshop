<?php
/**
 * Plugin Name: Woodin WooCommerce emails
 * Description: Gives every standard WooCommerce email (new order, order confirmation, completed, refunded, on hold, new account, password reset...) the Woodin look: brown header, logo, ivory body, serif headings, branded footer. Works through WooCommerce's own email settings and CSS filter, so it keeps working when WooCommerce updates.
 * Version: 1.0.0
 *
 * INSTALL: upload to wp-content/mu-plugins/ next to woodin-email-template.php. Nothing to activate.
 *
 * WHAT IT DOES
 *   - Forces these WooCommerce > Settings > Emails values: header image (Woodin logo), base colour (brown),
 *     background colour, body background, body text colour, footer text. They still show in the settings
 *     screen, but changing them there has no effect while this file is installed. Delete the file to go back.
 *   - Adds CSS: serif headings, spacing, link and button colours, softer borders.
 *   - Stops WooCommerce's "new account" email for accounts the eshop creates (customers there sign in with an
 *     emailed code, so "set your password" and a link to this site's My account page are wrong for them).
 *     Accounts created by hand in WordPress still get the normal email.
 *   - Makes the order number in customer emails link to the eshop's order tracking page (/track?order=N) for eshop
 *     orders, instead of this site's My account > View order page.
 *   - Does NOT touch the wording. Edit each email's subject, heading and "additional content" in
 *     WooCommerce > Settings > Emails > (the email) as usual.
 *
 * SETTINGS (optional, wp-config.php): define('WOODIN_SHOP_URL', 'https://www.woodinfashion.store');
 *   The logo is loaded from {WOODIN_SHOP_URL}/brand/woodin-logo-brown.png, so the eshop must be public.
 *
 * NOTE: written against the standard WooCommerce email system (WC_Emails + email-styles.php). Test with a
 * real test order on a copy of the site before relying on it.
 */

if (!defined('ABSPATH')) {
    exit;
}

/** Eshop origin. Reuses the helper from woodin-email-template.php when it is installed. */
function woodin_wc_emails_shop_url()
{
    if (function_exists('woodin_email_shop_url')) {
        return woodin_email_shop_url();
    }
    return defined('WOODIN_SHOP_URL') && WOODIN_SHOP_URL ? rtrim(WOODIN_SHOP_URL, '/') : 'https://www.woodinfashion.store';
}

/** 1. Brand values for WooCommerce > Settings > Emails. */
$woodin_wc_email_options = [
    'woocommerce_email_base_color'            => '#521B0A', // header band, links, buttons
    'woocommerce_email_background_color'      => '#EFE8DC', // page behind the email
    'woocommerce_email_body_background_color' => '#F8F5EF', // the email itself
    'woocommerce_email_text_color'            => '#3D332C', // body text
];
foreach ($woodin_wc_email_options as $option => $value) {
    add_filter('pre_option_' . $option, function () use ($value) {
        return $value;
    });
}

// The logo sits above the brown header band, on the sand background, so it needs the brown version.
add_filter('pre_option_woocommerce_email_header_image', function () {
    return woodin_wc_emails_shop_url() . '/brand/woodin-logo-brown.png';
});

// Replaces the default footer ("{site_title} - Built with WooCommerce").
add_filter('woocommerce_email_footer_text', function () {
    $shop = woodin_wc_emails_shop_url();
    return 'Woodin, Le créateur &middot; <a href="' . esc_url($shop) . '">' . esc_html(preg_replace('#^https?://#', '', $shop)) . '</a>';
});

/** 2. Extra CSS. WooCommerce inlines it into the email for you, so it works in Gmail and Outlook. */
add_filter('woocommerce_email_styles', function ($css) {
    $serif = "'DM Serif Display',Georgia,'Times New Roman',serif";
    $sans  = "'Jost','Helvetica Neue',Helvetica,Arial,sans-serif";
    return $css . "
        body, #body_content, #body_content_inner, td, th, p, li { font-family: $sans; }
        #template_header_image { padding-top: 32px; }
        #template_header_image p { margin: 0 0 28px; text-align: center; }
        #template_header_image img { width: 150px !important; max-width: 60% !important; height: auto !important; margin: 0 auto !important; text-transform: none !important; }
        #template_container { border: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
        #template_header { border-radius: 0 !important; border-bottom: 0 !important; }
        #header_wrapper { padding: 38px 40px !important; }
        #header_wrapper h1 { font-family: $serif !important; font-weight: 400 !important; font-size: 30px !important; line-height: 1.2 !important; letter-spacing: 0 !important; text-shadow: none !important; }
        #body_content { background-color: #F8F5EF; }
        #body_content_inner { font-size: 15px; line-height: 1.65; color: #3D332C; }
        #body_content_inner h2, #body_content_inner h3 { font-family: $serif; font-weight: 400; color: #521B0A; }
        #body_content_inner a { color: #521B0A; }
        .td { border-color: #E3DACB !important; color: #3D332C; }
        th.td { color: #5F554C; font-weight: 500; }
        .address { border-color: #E3DACB !important; }
        #credit { font-size: 12px; line-height: 1.7; color: #5F554C; padding: 28px 40px 36px; }
        #credit a { color: #5F554C; }
    ";
});

/**
 * 3. No "new account" email for customers created by the eshop. The eshop creates the WooCommerce customer
 *    through the REST API the first time someone signs in with a code; they have no password to set.
 */
add_filter('woocommerce_email_enabled_customer_new_account', function ($enabled) {
    return (defined('REST_REQUEST') && REST_REQUEST) ? false : $enabled;
});

/** 4. Eshop orders: "view order" links go to the eshop's tracking page, not this site's My account. */
add_filter('woocommerce_get_view_order_url', function ($url, $order) {
    if ($order && $order->get_meta('woodin_eshop') === '1') {
        return add_query_arg('order', $order->get_id(), woodin_wc_emails_shop_url() . '/track');
    }
    return $url;
}, 10, 2);
