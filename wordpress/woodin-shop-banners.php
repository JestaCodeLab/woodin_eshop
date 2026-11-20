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
 *   - Featured image   = the DESKTOP banner photo. Upload any landscape photo, at least 2400 px wide: WordPress crops it to
 *                        2400 x 1000 on upload. Keep the subject on the right half; the text sits over the left side.
 *   - Mobile image     = (optional) a separate photo for phones, at least 900 x 1100 px. If you skip it, the desktop photo
 *                        is cropped to a tall shape automatically. Use it when the automatic crop cuts the subject off.
 *   - To choose WHAT is cropped, open the photo in Media > Edit image > Crop, then save, before using it.
 *   - Page             = Men, Women or Fabrics
 *   - Order            = (right column, "Order") 1 is the first slide, 2 the second
 *   - Publish          = live. Move to Draft or Trash to take it down. Only the first two per page are shown.
 * Changes appear on the eshop within about 5 minutes.
 */

if (!defined('ABSPATH')) {
    exit;
}

/** Crop sizes. WordPress makes both whenever a photo is uploaded. Desktop keeps the RIGHT of the photo (text sits on the left). */
define('WOODIN_BANNER_DESKTOP', 'woodin_banner_desktop');
define('WOODIN_BANNER_MOBILE', 'woodin_banner_mobile');
add_action('after_setup_theme', function () {
    add_image_size(WOODIN_BANNER_DESKTOP, 2400, 1000, ['right', 'center']);
    add_image_size(WOODIN_BANNER_MOBILE, 900, 1100, ['center', 'center']);
});

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

add_action('admin_enqueue_scripts', function ($hook) {
    $screen = get_current_screen();
    if ($screen && $screen->post_type === 'woodin_banner' && in_array($hook, ['post.php', 'post-new.php'], true)) {
        wp_enqueue_media();
    }
});

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

    $mobile_id = (int) $get('wb_mobile_id');
    echo '<div class="wb-row"><label>Mobile image (optional)</label>';
    echo '<div id="wb_mobile_preview" style="margin-bottom:6px">' . ($mobile_id ? wp_get_attachment_image($mobile_id, [120, 147]) : '') . '</div>';
    printf('<input type="hidden" id="wb_mobile_id" name="wb_mobile_id" value="%d" />', $mobile_id);
    echo '<button type="button" class="button" id="wb_mobile_pick">Choose mobile image</button> <button type="button" class="button-link" id="wb_mobile_clear"' . ($mobile_id ? '' : ' style="display:none"') . '>Remove</button>';
    echo '<div class="wb-hint">Portrait photo for phones, at least 900 x 1100 px (it is cropped to that shape). Leave empty to crop the desktop photo automatically.</div></div>';
    echo '<script>
    jQuery(function ($) {
        var frame;
        $("#wb_mobile_pick").on("click", function (e) {
            e.preventDefault();
            frame = frame || wp.media({ title: "Mobile banner image", button: { text: "Use this image" }, library: { type: "image" }, multiple: false });
            frame.off("select").on("select", function () {
                var a = frame.state().get("selection").first().toJSON();
                $("#wb_mobile_id").val(a.id);
                var u = (a.sizes && a.sizes.thumbnail) ? a.sizes.thumbnail.url : a.url;
                $("#wb_mobile_preview").html("<img src=\"" + u + "\" style=\"max-width:120px;height:auto\" alt=\"\">");
                $("#wb_mobile_clear").show();
            });
            frame.open();
        });
        $("#wb_mobile_clear").on("click", function () { $("#wb_mobile_id").val(0); $("#wb_mobile_preview").empty(); $(this).hide(); });
    });
    </script>';

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
    $mobile = isset($_POST['wb_mobile_id']) ? absint($_POST['wb_mobile_id']) : 0;
    update_post_meta($post_id, 'wb_mobile_id', ($mobile && wp_attachment_is_image($mobile)) ? $mobile : 0);
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
                $img   = $thumb ? wp_get_attachment_image_src($thumb, WOODIN_BANNER_DESKTOP) : null;
                if (!$img) {
                    continue; // a banner without a photo is not shown
                }
                // Phone photo: the separate upload if there is one, otherwise the desktop photo cropped tall.
                $mid    = (int) get_post_meta($p->ID, 'wb_mobile_id', true);
                $mid    = ($mid && wp_attachment_is_image($mid)) ? $mid : $thumb;
                $mobile = wp_get_attachment_image_src($mid, WOODIN_BANNER_MOBILE) ?: $img;
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
                    'mobileImage' => ['url' => $mobile[0], 'width' => (int) $mobile[1], 'height' => (int) $mobile[2]],
                ];
            }
            return rest_ensure_response($out);
        },
    ]);
});
