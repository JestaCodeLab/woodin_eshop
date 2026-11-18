"use client";

import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { LOGO } from "@/lib/images";
import type { Store } from "@/lib/stores";

type Located = Store & { lat: number; lng: number };

interface Props {
  stores: Located[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Leaflet map with a Woodin "W" pin per store (selected = larger, brown).
 * Loaded on the client only (Leaflet needs `window`). The list next to it carries the same
 * information, so the map is an enhancement, not the only way to pick a store.
 */
export function StoreMap({ stores, selectedId, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !el.current) return;
      leaflet.current = L;
      // One-finger drag would trap page scroll on phones, so touch screens pan via the list and pinch.
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const m = L.map(el.current, { scrollWheelZoom: false, dragging: !coarse, attributionControl: true }).setView([5.6, -0.19], 11);
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m);
      map.current = m;
      // Trigger the marker sync below.
      m.fire("woodin:ready");
    })();
    const markerStore = markers.current;
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      markerStore.clear();
    };
  }, []);

  // Keep markers and viewport in sync with the stores and the selection.
  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      const m = map.current;
      const L = leaflet.current;
      if (cancelled || !m || !L) return;

      markers.current.forEach((mk) => mk.remove());
      markers.current.clear();
      stores.forEach((s) => {
        const selected = s.id === selectedId;
        const size = selected ? 52 : 38;
        const icon = L.divIcon({
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          html: `<span class="woodin-pin" data-selected="${selected}" style="width:${size}px;height:${size}px"><img src="${LOGO.mark.src}" alt="" /></span>`,
        });
        const mk = L.marker([s.lat, s.lng], { icon, title: s.name, keyboard: true, zIndexOffset: selected ? 1000 : 0 })
          .on("click", () => onSelectRef.current(s.id))
          .addTo(m);
        markers.current.set(s.id, mk);
      });

      const sel = stores.find((s) => s.id === selectedId);
      if (sel) m.flyTo([sel.lat, sel.lng], Math.max(m.getZoom(), 14), { duration: 0.6 });
      else if (stores.length > 0) m.fitBounds(L.latLngBounds(stores.map((s) => [s.lat, s.lng] as [number, number])), { padding: [60, 60], maxZoom: 14 });
    };

    if (map.current && leaflet.current) sync();
    else {
      // Map still loading: wait for it.
      const t = setInterval(() => {
        if (map.current && leaflet.current) {
          clearInterval(t);
          sync();
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(t);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [stores, selectedId]);

  return <div ref={el} role="region" aria-label="Map of Woodin stores" className="h-[340px] w-full bg-[#e9e3d6] md:h-[440px]" />;
}
