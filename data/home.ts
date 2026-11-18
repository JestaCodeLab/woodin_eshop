import { IMG } from "@/lib/images";
import { shopHref } from "@/lib/links";

/**
 * Home-page content lifted from the design's renderVals() arrays.
 * Product data is demo data until step 3 swaps in the WooCommerce Store API.
 */

export interface WorldCard {
  eyebrow: string;
  title: string;
  href: string;
  img: string;
  pos: string;
  alt: string;
}

export const WORLD_CARDS: WorldCard[] = [
  { eyebrow: "Woodin Ready To Wear", title: "Simulation 2026", href: shopHref(), img: IMG.modelsSmiling, pos: "50% 30%", alt: "Three models smiling in Simulation print shirts" },
  { eyebrow: "Woodin Women", title: "Elegance", href: shopHref("women"), img: IMG.womenPinkGreen, pos: "46% 30%", alt: "Two women in a pink print dress and green print blouse" },
  { eyebrow: "Woodin Men", title: "Heritage", href: shopHref("men"), img: IMG.menHeritage, pos: "50% 30%", alt: "Three men in heritage print shirts" },
  { eyebrow: "Woodin Ready To Wear", title: "Bold Fusion", href: shopHref(), img: IMG.womenTieredSkirt, pos: "50% 30%", alt: "Two women in a tiered print skirt and patchwork shorts" },
  { eyebrow: "Woodin Fabrics", title: "Prints by the piece", href: shopHref("fabrics"), img: IMG.womanBoxyShirt, pos: "50% 30%", alt: "Woman in the Sunday Patchwork print" },
  { eyebrow: "Woodin Accessories", title: "Statement pieces", href: shopHref("accessories"), img: IMG.womanShorts, pos: "50% 22%", alt: "Woman wearing a cord necklace and statement earrings" },
  { eyebrow: "Woodin Women", title: "Golden Hour", href: shopHref("women"), img: IMG.womenPeplum, pos: "50% 25%", alt: "Two women in print blouse and dress" },
];

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
