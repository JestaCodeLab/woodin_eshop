import type { Store } from "@/lib/stores";

/**
 * Google Maps embed for the selected store, found from its address (coordinates are optional).
 * - With NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY: the official Maps Embed API (free; restrict the key to
 *   your domains in Google Cloud > Credentials > HTTP referrers).
 * - Without a key: the classic keyless embed, as used on woodinfashion.com.
 */
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;

export interface LatLng {
  lat: number;
  lng: number;
}

function embedUrl(store: Store, origin: LatLng | null): string {
  const text = store.mapQuery ?? store.address;
  const place =
    store.mapQuery || store.lat === undefined || store.lng === undefined
      ? /ghana/i.test(text)
        ? text
        : `${text}, Ghana`
      : `${store.lat},${store.lng}`;
  const q = encodeURIComponent(place);
  // With the visitor's location: show the route from them to the store, inside the embed.
  if (origin) {
    const from = `${origin.lat},${origin.lng}`;
    return KEY
      ? `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(KEY)}&origin=${from}&destination=${q}&mode=driving`
      : `https://maps.google.com/maps?saddr=${from}&daddr=${q}&output=embed`;
  }
  return KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(KEY)}&q=${q}&zoom=15`
    : `https://maps.google.com/maps?q=${q}&t=m&z=15&output=embed&iwloc=near`;
}

export function StoreMap({ store, origin = null }: { store: Store; origin?: LatLng | null }) {
  return (
    <iframe
      // A new key per store forces a clean reload when the selection changes.
      key={`${store.id}-${origin ? "route" : "place"}`}
      title={`Map showing ${store.name}`}
      src={embedUrl(store, origin)}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
      className="block h-[340px] w-full border-0 bg-[#e9e3d6] md:h-[440px]"
    />
  );
}
