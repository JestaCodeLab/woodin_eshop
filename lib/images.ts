/**
 * Campaign photography and brand assets, downloaded from the design canvas.
 * Crops (object-position / zoom) live next to each usage, as in the design.
 */
export const IMG = {
  heroSail: "/images/hero-simulation-sail.jpg", // canvas "C" — 3 people, white sail, sunset
  menHeritage: "/images/men-three-heritage-shirts.jpg", // "A"
  womenPinkGreen: "/images/women-pink-dress-green-blouse.jpg", // "B"
  menPatchworkHat: "/images/men-patchwork-shirts-straw-hat.jpg", // "D"
  modelsSmiling: "/images/models-smiling-print-shirts.jpg", // "E"
  menSunset: "/images/men-sunset-print-shirts.jpg", // "F"
  womanBoxyShirt: "/images/woman-yellow-patchwork-boxy-shirt.jpg", // "G"
  womanShorts: "/images/woman-paperbag-shorts-necklace.jpg", // "H"
  womenTieredSkirt: "/images/women-tiered-skirt-patchwork-shorts.jpg", // "I"
  womenPeplum: "/images/women-peplum-blouse-fit-flare-dress.jpg", // "J"
} as const;

export const LOGO = {
  white: { src: "/brand/woodin-logo-white.png", width: 632, height: 200 },
  brown: { src: "/brand/woodin-logo-brown.png", width: 631, height: 200 },
  footer: { src: "/brand/woodin-logo-footer.png", width: 515, height: 600 },
  mark: { src: "/brand/woodin-mark.png", width: 300, height: 260 },
} as const;
