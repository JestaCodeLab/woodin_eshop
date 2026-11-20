<?php
/**
 * Plugin Name: Woodin shop banners
 * Description: Adds a "Shop banners" screen to WordPress. Each banner is one slide shown at the top of the Men, Women or Fabrics page on the Woodin eshop (two slides per page). Read by the eshop through /wp-json/woodin/v1/banners.
 * Version: 1.0.0
 *
 * INSTALL: upload this file to wp-content/mu-plugins/ (same folder as woodin-order-tracking.php).
 * Must-use plugins load automatically; there is nothing to activate.
 *
 * HOW STAFF USE IT: WordPress admin > Shop banners > Add New.
 *   - Title            = the big headline (e.g. "The Heritage drop")
 *   - Featured image   = the banner photo (landscape, about 2400 x 1000 px; keep faces/subject on the right half,
 *                        the text sits over the left side)
 *   - Page             = Men, Women or Fabrics
 *   - Order            = (right column, "Order") 1 is the first slide, 2 the second
 *   - Publish          = live. Move to Draft or Trash to take it down. Only the first two per page are shown.
 * Changes appear on the eshop within about 5 minutes.
 */

if (!defined('ABSPATH')) {
    exit;
}

/** 1. The "Shop banners" post type (hidden from the public site, no front-end page of its own). */
add_action('init', function () {
    register_post_type('woodin_banner', [
        'labels' => [
            'name'          => 'Shop banners',
            'singular_name' => 'Shop banner',
            'add_new_item'  => 'Add new banner',
            'edit_item'     => 'Edit banner',
            'all_items'     => 'All banners',
        ],
        'public'              => false,
        'show_ui'             => true,
        'show_in_menu'        => true,
        'show_in_rest'        => false,
        'menu_icon'           => 'dashicons-images-alt2',
        'menu_position'       => 26,
        'supports'            => ['title', 'thumbnail', 'page-attributes'],
        'capability_type'     => 'post',
        'exclude_from_search' => true,
    ]);
});

function woodin_banner_sections()
{
    return ['men' => 'Men', 'women' => 'Women', 'fabrics' => 'Fabrics'];
}

/** 2. The fields box. */
add_action('add_meta_boxes', function () {
    add_meta_box('woodin_banner_fields', 'Banner details', 'woodin_banner_box', 'woodin_banner', 'normal', 'high');
});

function woodin_banner_box($post)
{
    wp_nonce_field('woodin_banner_save', 'woodin_banner_nonce');
    $get = function ($k) use ($post) {
        return (string) get_post_meta($post->ID, $k, true);
    };

    echo '<style>.wb-row{margin:0 0 14px}.wb-row label{display:block;font-weight:600;margin-bottom:4px}.wb-row input[type=text],.wb-row textarea,.wb-row select{width:100%}.wb-hint{color:#646970;font-size:12px;margin-top:3px}.wb-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}</style>';

    echo '<div class="wb-row"><label for="wb_section">Show on page</label><select id="wb_section" name="wb_section">';
    foreach (woodin_banner_sections() as $key => $label) {
        printf('<option value="%s"%s>%s</option>', esc_attr($key), selected($get('wb_section'), $key, false), esc_html($label));
    }
    echo '</select><div class="wb-hint">Only the first two published banners (by Order) for each page are shown.</div></div>';

    $text = [
        ['wb_badge',   'Badge',                 'JUST LANDED',          'Small gold label at the top. Leave empty for none.'],
        ['wb_eyebrow', 'Small line above title', 'NEW IN · MEN',         ''],
    ];
    foreach ($text as [$key, $label, $ph, $hint]) {
        printf(
            '<div class="wb-row"><label for="%1$s">%2$s</label><input type="text" id="%1$s" name="%1$s" value="%3$s" placeholder="%4$s" maxlength="60" />%5$s</div>',
            esc_attr($key), esc_html($label), esc_attr($get($key)), esc_attr($ph),
            $hint ? '<div class="wb-hint">' . esc_html($hint) . '</div>' : ''
        );
    }

    printf(
        '<div class="wb-row"><label for="wb_text">Short description</label><textarea id="wb_text" name="wb_text" rows="3" maxlength="220">%s</textarea><div class="wb-hint">One or two sentences, up to about 200 characters.</div></div>',
        esc_textarea($get('wb_text'))
    );

    echo '<div class="wb-grid">';
    $buttons = [
        ['wb_cta_label',  'Main button text', 'SHOP NEW FOR MEN', 60],
        ['wb_cta_url',    'Main button link', '/shop?cat=men',    300],
        ['wb_link_label', 'Second link text (optional)', 'SEE IT STYLED', 60],
        ['wb_link_url',   'Second link link (optional)', '/insights',    300],
    ];
    foreach ($buttons as [$key, $label, $ph, $max]) {
        printf(
            '<div class="wb-row"><label for="%1$s">%2$s</label><input type="text" id="%1$s" name="%1$s" value="%3$s" placeholder="%4$s" maxlength="%5$d" /></div>',
            esc_attr($key), esc_html($label), esc_attr($get($key)), esc_attr($ph), $max
        );
    }
    echo '</div><div class="wb-hint" style="margin:-6px 0 14px">Links: use a page on the eshop such as <code>/shop?cat=men</code> or a full <code>https://</code> address.</div>';
}

add_action('save_post_woodin_banner', function ($post_id) {
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    if (!isset($_POST['woodin_banner_nonce']) ||
        !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['woodin_banner_nonce'])), 'woodin_banner_save')) {
        return;
    }
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    $section = isset($_POST['wb_section']) ? sanitize_key(wp_unslash($_POST['wb_section'])) : 'men';
    update_post_meta($post_id, 'wb_section', array_key_exists($section, woodin_banner_sections()) ? $section : 'men');

    foreach (['wb_badge', 'wb_eyebrow', 'wb_cta_label', 'wb_link_label'] as $k) {
        update_post_meta($post_id, $k, isset($_POST[$k]) ? sanitize_text_field(wp_unslash($_POST[$k])) : '');
    }
    update_post_meta($post_id, 'wb_text', isset($_POST['wb_text']) ? sanitize_textarea_field(wp_unslash($_POST['wb_text'])) : '');

    // Links: a site path ("/shop?cat=men") or an https URL. Anything else is dropped.
    foreach (['wb_cta_url', 'wb_link_url'] as $k) {
        $raw = isset($_POST[$k]) ? trim(sanitize_text_field(wp_unslash($_POST[$k]))) : '';
        $ok  = ($raw !== '' && preg_match('#^/(?![/\\\\])#', $raw)) || stripos($raw, 'https://') === 0;
        update_post_meta($post_id, $k, $ok ? $raw : '');
    }
});

/** Admin list: show which page each banner is for. */
add_filter('manage_woodin_banner_posts_columns', function ($cols) {
    return ['cb' => $cols['cb'], 'title' => 'Headline', 'wb_section' => 'Page', 'wb_image' => 'Image', 'menu_order' => 'Order', 'date' => $cols['date']];
});
add_action('manage_woodin_banner_posts_custom_column', function ($col, $post_id) {
    if ($col === 'wb_section') {
        $s = get_post_meta($post_id, 'wb_section', true);
        $all = woodin_banner_sections();
        echo esc_html($all[$s] ?? '-');
    } elseif ($col === 'wb_image') {
        echo has_post_thumbnail($post_id) ? get_the_post_thumbnail($post_id, [80, 34]) : '<em>no image</em>';
    } elseif ($col === 'menu_order') {
        echo (int) get_post_field('menu_order', $post_id);
    }
}, 10, 2);

/** 3. Public read-only endpoint for the eshop: GET /wp-json/woodin/v1/banners */
add_action('rest_api_init', function () {
    register_rest_route('woodin/v1', '/banners', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function () {
            $posts = get_posts([
                'post_type'      => 'woodin_banner',
                'post_status'    => 'publish',
                'posts_per_page' => 30,
                'orderby'        => ['menu_order' => 'ASC', 'date' => 'DESC'],
            ]);

            $out   = [];
            $count = [];
            foreach ($posts as $p) {
                $section = get_post_meta($p->ID, 'wb_section', true);
                if (!array_key_exists($section, woodin_banner_sections())) {
                    continue;
                }
                $count[$section] = ($count[$section] ?? 0) + 1;
                if ($count[$section] > 2) {
                    continue; // two slides per page
                }
                $thumb = get_post_thumbnail_id($p->ID);
                $img   = $thumb ? wp_get_attachment_image_src($thumb, 'full') : null;
                if (!$img) {
                    continue; // a banner without a photo is not shown
                }
                $m = function ($k) use ($p) {
                    return (string) get_post_meta($p->ID, $k, true);
                };
                $out[] = [
                    'id'        => $p->ID,
                    'section'   => $section,
                    'heading'   => html_entity_decode(get_the_title($p), ENT_QUOTES, 'UTF-8'),
                    'badge'     => $m('wb_badge'),
                    'eyebrow'   => $m('wb_eyebrow'),
                    'text'      => $m('wb_text'),
                    'ctaLabel'  => $m('wb_cta_label'),
                    'ctaUrl'    => $m('wb_cta_url'),
                    'linkLabel' => $m('wb_link_label'),
                    'linkUrl'   => $m('wb_link_url'),
                    'image'     => ['url' => $img[0], 'width' => (int) $img[1], 'height' => (int) $img[2], 'alt' => (string) get_post_meta($thumb, '_wp_attachment_image_alt', true)],
                ];
            }
            return rest_ensure_response($out);
        },
    ]);
});
