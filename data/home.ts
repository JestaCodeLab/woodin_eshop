import { IMG } from "@/lib/images";
import type { ProductCardData } from "@/lib/types";

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
  { eyebrow: "Woodin Ready To Wear", title: "Simulation 2026", href: "/ready-to-wear", img: IMG.modelsSmiling, pos: "50% 30%", alt: "Three models smiling in Simulation print shirts" },
  { eyebrow: "Woodin Women", title: "Elegance", href: "/ready-to-wear?cat=women", img: IMG.womenPinkGreen, pos: "46% 30%", alt: "Two women in a pink print dress and green print blouse" },
  { eyebrow: "Woodin Men", title: "Heritage", href: "/ready-to-wear?cat=men", img: IMG.menHeritage, pos: "50% 30%", alt: "Three men in heritage print shirts" },
  { eyebrow: "Woodin Ready To Wear", title: "Bold Fusion", href: "/ready-to-wear", img: IMG.womenTieredSkirt, pos: "50% 30%", alt: "Two women in a tiered print skirt and patchwork shorts" },
  { eyebrow: "Woodin Fabrics", title: "Prints by the piece", href: "/fabrics", img: IMG.womanBoxyShirt, pos: "50% 30%", alt: "Woman in the Sunday Patchwork print" },
  { eyebrow: "Woodin Accessories", title: "Statement pieces", href: "/shop?cat=accessories", img: IMG.womanShorts, pos: "50% 22%", alt: "Woman wearing a cord necklace and statement earrings" },
  { eyebrow: "Woodin Lookbook", title: "Golden Hour", href: "/lookbook", img: IMG.womenPeplum, pos: "50% 25%", alt: "Two women in print blouse and dress" },
];

export const NEW_IN: ProductCardData[] = [
  { slug: "peplum-blouse", title: "Peplum Blouse", cat: "Blouses", badge: "New", image: IMG.womenPeplum, pos: "22% 32%", swatches: ["#2E7D4F", "#C8507A"] },
  { slug: "paperbag-shorts", title: "Paperbag Shorts", cat: "Shorts", badge: "New", image: IMG.womanShorts, pos: "50% 72%", swatches: ["#C9B21F", "#174A8B"] },
  { slug: "shirt-dress", title: "Shirt Dress", cat: "Dresses", badge: "Simulation", image: IMG.womenPeplum, pos: "82% 45%", swatches: ["#C8507A", "#2E7D4F"] },
  { slug: "boxy-shirt", title: "Boxy Shirt", cat: "Shirts", badge: "Last few", image: IMG.womanBoxyShirt, pos: "50% 35%", swatches: ["#C9B21F", "#B83A14"] },
];

export interface LookItem {
  slug: string;
  title: string;
  cat: string;
  pos: string;
}

export const SHOP_THE_LOOK: LookItem[] = [
  { slug: "panel-shirt", title: "Panel Shirt", cat: "Men · Shirts", pos: "33% 35%" },
  { slug: "boxy-shirt", title: "Boxy Shirt", cat: "Women · Shirts", pos: "50% 45%" },
  { slug: "kaftan-shirt", title: "Kaftan Shirt", cat: "Men · Shirts", pos: "66% 40%" },
];

export const FABRIC_PRINTS = [
  { name: "Green Leaf", img: IMG.womenPinkGreen, pos: "68% 48%", zoom: 2.4 },
  { name: "Sunday Patchwork", img: IMG.womanBoxyShirt, pos: "45% 45%", zoom: 2.2 },
  { name: "Terracotta Geo", img: IMG.menPatchworkHat, pos: "35% 55%", zoom: 2.6 },
];

export interface InsightTeaser {
  title: string;
  tag: string;
  date: string;
  img: string;
  pos: string;
  href: string;
}

/** Demo posts. Replaced by wp/v2/posts in step 3. */
export const INSIGHT_TEASERS: InsightTeaser[] = [
  { title: "Woodin unveils “Simulation”: a bold new ready-to-wear collection for 2026", tag: "Collections", date: "3 Aug 2026", img: IMG.menHeritage, pos: "50% 30%", href: "/insights" },
  { title: "Union de Woodin — celebrating togetherness through design", tag: "Culture", date: "9 Mar 2026", img: IMG.heroSail, pos: "50% 30%", href: "/insights" },
  { title: "Woodin launches a new ready-to-wear collection in 25 trendy styles", tag: "News", date: "11 Sep 2025", img: IMG.menSunset, pos: "50% 30%", href: "/insights" },
];

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
