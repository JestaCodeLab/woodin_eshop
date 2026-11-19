"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import type { Store } from "@/lib/stores";

import { StoreMap } from "./StoreMap";

type Located = Store & { lat: number; lng: number };
const hasCoords = (s: Store): s is Located => s.lat !== undefined && s.lng !== undefined;

/** Search and region chips only earn their space once there are enough stores to filter. */
const FILTER_THRESHOLD = 3;

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function directionsUrl(s: Store): string {
  if (s.directionsUrl) return s.directionsUrl;
  if (s.mapQuery) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.mapQuery)}`;
  if (hasCoords(s)) return `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address}`)}`;
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

const chip = (on: boolean) =>
  `label-caps h-11 border px-5 tracking-[0.16em] ${on ? "border-brown bg-brown text-ivory" : "border-line-strong bg-transparent text-ink"}`;

// `?store=<id>` is read in the browser (not via the page's searchParams) so the page itself
// has no URL data and its shell stays static and instant.
const subscribeToUrl = (notify: () => void) => {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
};
const readStoreParam = () => new URLSearchParams(window.location.search).get("store");

export function StoreLocator({ stores }: { stores: Store[] }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const urlStore = useSyncExternalStore(subscribeToUrl, readStoreParam, () => null);
  // What the visitor picked wins; until they pick, a valid ?store= from the URL is used.
  const [picked, setSelectedId] = useState<string | null>(null);
  const selectedId = picked ?? (urlStore && stores.some((s) => s.id === urlStore) ? urlStore : null);
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [geo, setGeo] = useState<"idle" | "locating" | "denied" | "unsupported" | "empty">("idle");

  const regions = useMemo(() => [...new Set(stores.map((s) => s.region).filter((r): r is string => !!r))], [stores]);
  const filtersOn = stores.length > FILTER_THRESHOLD;

  const visible = useMemo(() => {
    const q = norm(query.trim());
    const list = stores
      .filter((s) => !region || s.region === region)
      .filter((s) => !q || norm(`${s.name} ${s.address} ${s.region ?? ""}`).includes(q))
      .map((s) => ({ store: s, km: here && hasCoords(s) ? distanceKm(here, s) : null }));
    if (here) list.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
    return list;
  }, [stores, query, region, here]);

  const selected = visible.find((v) => v.store.id === selectedId)?.store ?? visible[0]?.store ?? null;

  function locate() {
    if (!("geolocation" in navigator)) return setGeo("unsupported");
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Used only in this browser to sort by distance. Nothing is sent anywhere.
        setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeo("idle");
      },
      () => setGeo("denied"),
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }

  const geoMessage =
    geo === "locating" ? "Finding your location…" : geo === "denied" ? "We could not get your location. Allow location access in your browser and try again." : geo === "unsupported" ? "Your browser can't share its location." : here ? "Showing the route from your location." : "";

  return (
    <>
      <section className="content-wrap flex flex-wrap items-end justify-between gap-6 pb-8 pt-10 md:pt-14">
        <div className="flex flex-col gap-3.5">
          <span className="label-caps tracking-[0.28em] text-gold">Visit us</span>
          <h1 className="m-0 font-display text-[clamp(34px,4.5vw,60px)] font-normal leading-none text-brown">Find a store</h1>
        </div>

        <div className="flex flex-col gap-2 md:max-w-[520px] md:flex-[0_1_520px]">
          {filtersOn ? (
            <>
              <label htmlFor="store-search" className="label-caps tracking-[0.16em]">
                City or area
              </label>
              <input
                id="store-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Osu, Accra"
                className="h-[54px] border border-line-strong bg-white px-4 text-[15px]"
              />
            </>
          ) : null}
        </div>
      </section>

      {filtersOn && regions.length > 1 ? (
        <section className="content-wrap pb-6">
          <div role="group" aria-label="Region" className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={region === null} onClick={() => setRegion(null)} className={chip(region === null)}>
              All regions
            </button>
            {regions.map((r) => (
              <button key={r} type="button" aria-pressed={region === r} onClick={() => setRegion(r)} className={chip(region === r)}>
                {r}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="content-wrap flex flex-wrap items-stretch gap-6 pb-20 md:pb-[88px]">
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-2.5">
          <span className="text-[13px] text-muted">
            {visible.length} {visible.length === 1 ? "store" : "stores"}
          </span>
          {visible.length === 0 ? (
            <div className="border border-line bg-white p-6 text-[15px] font-light">
              No stores match that search.{" "}
              <button type="button" className="border-0 bg-transparent p-0 underline" onClick={() => { setQuery(""); setRegion(null); }}>
                Clear search
              </button>
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {visible.map(({ store, km }) => {
                const on = selected?.id === store.id;
                return (
                  <li key={store.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSelectedId(store.id)}
                      className={`flex w-full flex-col gap-1.5 bg-white p-[18px] text-left md:px-5 ${on ? "border border-brown shadow-[inset_3px_0_0_var(--color-brown)]" : "border border-line"}`}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-display text-[22px] leading-tight">{store.name}</span>
                        {km !== null ? <span className="shrink-0 text-[13px] text-muted">{km.toFixed(1)} km</span> : null}
                      </span>
                      <span className="text-sm font-light text-body">{store.address}</span>
                      {store.hours?.[0] ? (
                        <span className="text-[13px] text-instock">
                          {store.hours[0].label} · {store.hours[0].hours}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex min-w-0 flex-[1.6_1_520px] flex-col border border-line bg-white">
          {selected ? (
            <div className="relative">
              <StoreMap store={selected} origin={here} />
              {/* Top right of the map, left of Google's own fullscreen control. */}
              <button
                type="button"
                onClick={locate}
                disabled={geo === "locating"}
                className="label-caps absolute right-14 top-3 h-10 border border-brown bg-white/95 px-4 tracking-[0.14em] text-brown shadow-sm transition-colors hover:bg-brown hover:text-ivory disabled:opacity-60"
              >
                {geo === "locating" ? "Locating…" : "Use my location"}
              </button>
            </div>
          ) : null}
          <p role="status" className="m-0 border-b border-line px-6 py-2 text-[13px] text-muted empty:hidden md:px-7">
            {geoMessage}
          </p>

          {selected ? (
            <div className="flex flex-wrap gap-7 p-6 md:p-7">
              <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2.5">
                <span className="label-caps tracking-[0.2em] text-gold">Selected store</span>
                <h2 className="m-0 font-display text-[clamp(26px,3vw,32px)] font-normal leading-[1.05]">{selected.name}</h2>
                <span className="text-[15px] font-light text-body">{selected.address}</span>
                {selected.phone || selected.gps ? (
                  <span className="text-[15px] font-light text-body">{[selected.phone, selected.gps].filter(Boolean).join(" · ")}</span>
                ) : null}
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <Button href={directionsUrl(selected)} variant="primary" className="px-[22px] py-[15px] tracking-[0.18em]" target="_blank" rel="noopener noreferrer">
                    Get directions
                  </Button>
                  {selected.phone ? (
                    <Button href={telHref(selected.phone)} variant="outline-brown" className="px-[22px] py-3.5 tracking-[0.18em]">
                      Call store
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2 text-sm">
                <h3 className="label-caps m-0 tracking-[0.2em]">Opening hours</h3>
                {selected.hours && selected.hours.length > 0 ? (
                  selected.hours.map((h) => (
                    <span key={h.label} className="flex justify-between gap-3">
                      <span>{h.label}</span>
                      <span>{h.hours}</span>
                    </span>
                  ))
                ) : (
                  <span className="font-light text-muted">[HOURS]</span>
                )}
              </div>

              <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2 text-sm font-light">
                <h3 className="label-caps m-0 font-medium tracking-[0.2em]">In this store</h3>
                {(selected.services ?? []).map((svc) => (
                  <span key={svc}>✓ {svc}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
