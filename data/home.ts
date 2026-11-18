import { IMG } from "@/lib/images";

/**
 * Home-page content lifted from the design's renderVals() arrays.
 * Product data is demo data until step 3 swaps in the WooCommerce Store API.
 */

/** Live products used in "Shop the look" (men's polos worn in the campaign image). Missing ids are skipped. */
export const SHOP_THE_LOOK_IDS = [2962, 2951, 2964];

export const SERVICES = [
  { title: "Pay your way", body: "MTN MoMo, Telecel Cash, AT Money or card, secured by Paystack." },
  { title: "Delivery across Ghana", body: "Accra in [X] days, other regions in [X] days." },
  { title: "Click & collect", body: "Order online and collect free at a Woodin store." },
  { title: "Easy exchanges", body: "Wrong size? Exchange within [X] days, in store or by courier." },
];

export const WEAR_WOODIN_TILES = [
  { img: IMG.menHeritage, pos: "50% 30%" },
  { img: IMG.womanShorts, pos: "50% 30%" },
  { img: IMG.menPatchworkHat, pos: "60% 30%" },
  { img: IMG.womanBoxyShirt, pos: "50% 20%" },
  { img: IMG.menSunset, pos: "50% 30%" },
  { img: IMG.womenTieredSkirt, pos: "50% 30%" },
];
