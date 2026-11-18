/**
 * MODEL SHOTS for fabrics. Hovering a fabric card (and the second tile on a fabric's product
 * page) shows a model wearing a Woodin print.
 *
 * WooCommerce has one swatch photo per fabric and no model photos, so a small set of model
 * shots is rotated across all fabrics: fabric N gets shot (N mod number-of-shots). The pairing is
 * stylistic (the model's print is not the swatch's print). [CONFIRM] with Woodin.
 *
 * To add or replace shots:
 *   1. Put the image in public/images/models/ (portrait, ideally ~4:5, model centred).
 *   2. Add or edit an entry below. Any number of shots works; 2 alternate, 3 rotate, etc.
 *
 * Empty list = no model view (cards just zoom slightly on hover).
 */
export interface ModelShot {
  src: string;
  alt: string;
  /** object-position crop, e.g. "50% 40%". */
  pos?: string;
}

export const FABRIC_MODEL_SHOTS: ModelShot[] = [
  // PROVISIONAL: cropped from the reference screenshot. Replace with the final shot.
  { src: "/images/models/model-1.jpg", alt: "Model wearing a Woodin wax-print dress", pos: "50% 45%" },
  // Add the second shot here, e.g.:
  // { src: "/images/models/model-2.jpg", alt: "Model wearing a Woodin wax-print outfit", pos: "50% 45%" },
];

/** The shot for a given fabric product (stable per product, alternating across the catalogue). */
export function modelShotFor(productId: number): ModelShot | null {
  if (FABRIC_MODEL_SHOTS.length === 0) return null;
  return FABRIC_MODEL_SHOTS[productId % FABRIC_MODEL_SHOTS.length];
}
