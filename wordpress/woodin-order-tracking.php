<?php
/**
 * Plugin Name: Woodin order tracking
 * Description: Adds "Shipped" and "Ready for collection" order statuses and a Ghana Post tracking number box to WooCommerce orders. Used by the Woodin eshop (the /track page and SMS updates).
 * Version: 1.0.0
 *
 * INSTALL: upload this file to wp-content/mu-plugins/ (create the folder if it does not exist).
 * Must-use plugins load automatically; there is nothing to activate.
 *
 * NOTE: written for WooCommerce with or without High-Performance Order Storage. Test on a copy of the
 * site first.
 */

if (!defined('ABSPATH')) {
    exit;
}

/** 1. Two extra order statuses. */
add_action('init', function () {
    register_post_status('wc-shipped', [
        'label'                     => 'Shipped',
        'public'                    => true,
        'exclude_from_search'       => false,
        'show_in_admin_all_list'    => true,
        'show_in_admin_status_list' => true,
        /* translators: %s: number of orders */
        'label_count'               => _n_noop('Shipped <span class="count">(%s)</span>', 'Shipped <span class="count">(%s)</span>'),
    ]);
    register_post_status('wc-ready-collection', [
        'label'                     => 'Ready for collection',
        'public'                    => true,
        'exclude_from_search'       => false,
        'show_in_admin_all_list'    => true,
        'show_in_admin_status_list' => true,
        /* translators: %s: number of orders */
        'label_count'               => _n_noop('Ready for collection <span class="count">(%s)</span>', 'Ready for collection <span class="count">(%s)</span>'),
    ]);
});

add_filter('wc_order_statuses', function ($statuses) {
    $statuses['wc-shipped']          = 'Shipped';
    $statuses['wc-ready-collection'] = 'Ready for collection';
    return $statuses;
});

// Treat both as "paid" statuses, so reports and stock behave as they do for Processing.
add_filter('woocommerce_order_is_paid_statuses', function ($statuses) {
    $statuses[] = 'shipped';
    $statuses[] = 'ready-collection';
    return $statuses;
});

/** 2. "Woodin tracking" box on the order screen (right-hand column). */
add_action('add_meta_boxes', function () {
    $screen = function_exists('wc_get_page_screen_id') ? wc_get_page_screen_id('shop-order') : 'shop_order';
    add_meta_box('woodin_tracking', 'Woodin tracking (Ghana Post)', 'woodin_tracking_box', $screen, 'side', 'default');
});

function woodin_tracking_box($post_or_order)
{
    $order = ($post_or_order instanceof WP_Post) ? wc_get_order($post_or_order->ID) : $post_or_order;
    if (!$order) {
        return;
    }
    wp_nonce_field('woodin_tracking_save', 'woodin_tracking_nonce');
    printf(
        '<p><label for="woodin_tracking_number"><strong>Ghana Post tracking number</strong></label></p>' .
        '<input type="text" id="woodin_tracking_number" name="woodin_tracking_number" value="%s" style="width:100%%" autocomplete="off" />',
        esc_attr($order->get_meta('woodin_tracking_number'))
    );
    echo '<p class="description">Shown to the customer on the eshop /track page and sent by SMS. Set the order status to <em>Shipped</em> and click Update.</p>';
}

add_action('woocommerce_process_shop_order_meta', function ($order_id) {
    if (!isset($_POST['woodin_tracking_nonce']) ||
        !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['woodin_tracking_nonce'])), 'woodin_tracking_save')) {
        return;
    }
    if (!current_user_can('edit_shop_orders')) {
        return;
    }
    $order = wc_get_order($order_id);
    if (!$order) {
        return;
    }
    $number = isset($_POST['woodin_tracking_number']) ? sanitize_text_field(wp_unslash($_POST['woodin_tracking_number'])) : '';
    $order->update_meta_data('woodin_tracking_number', $number);
    $order->save();
}, 10, 1);

/**
 * 3. Customer email when an order moves to "Shipped" or "Ready for collection".
 * WooCommerce only emails for its built-in statuses (Processing, Completed, ...), so these two need their own.
 * The SMS goes out separately through the eshop webhook. Optional: define('WOODIN_TRACK_URL', 'https://your-eshop/track')
 * in wp-config.php to change the tracking page link.
 */
function woodin_send_status_email($order_id, $kind)
{
    $order = wc_get_order($order_id);
    if (!$order || !is_email($order->get_billing_email())) {
        return;
    }
    $flag = 'woodin_email_sent_' . $kind;
    if ($order->get_meta($flag)) {
        return; // never email the same step twice
    }

    $name    = $order->get_billing_first_name() ?: 'there';
    $number  = $order->get_id();
    $track   = defined('WOODIN_TRACK_URL') ? WOODIN_TRACK_URL : 'https://www.woodinfashion.store/track';
    $code    = trim((string) $order->get_meta('woodin_tracking_number'));

    if ($kind === 'shipped') {
        $subject = "Your Woodin order #$number has shipped";
        $lines   = ["Good news, $name. Your order #$number has been handed to Ghana Post."];
        if ($code !== '') {
            $lines[] = "Ghana Post tracking number: $code";
        }
    } else {
        $subject = "Your Woodin order #$number is ready for collection";
        $lines   = ["Good news, $name. Your order #$number is ready for collection in store. Please bring your order number."];
    }
    $lines[] = "Follow your order any time: $track";
    $lines[] = "Thank you for shopping with Woodin.";

    wp_mail($order->get_billing_email(), $subject, implode("\n\n", $lines));
    $order->update_meta_data($flag, '1');
    $order->save();
}
add_action('woocommerce_order_status_shipped', function ($order_id) {
    woodin_send_status_email($order_id, 'shipped');
}, 20);
add_action('woocommerce_order_status_ready-collection', function ($order_id) {
    woodin_send_status_email($order_id, 'ready');
}, 20);
