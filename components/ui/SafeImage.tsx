"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * A product photo that heals itself. The photos live on the WordPress site, which is slow and sometimes drops
 * a request; the browser then shows a broken-image icon and never tries again.
 *
 *   1. normal: through the shop's image optimizer (resized, modern formats)
 *   2. if that fails: straight from WordPress, skipping the optimizer (and its timeout)
 *   3. one more try a moment later
 *   4. still nothing: render no <img> at all, so the grey tile shows instead of a broken icon
 *
 * `fill` images sit in a parent with a background colour, so step 4 looks like an image that is "loading".
 */
export function SafeImage(props: ImageProps) {
  const [stage, setStage] = useState<0 | 1 | 2 | 3>(0);
  const img = useRef<HTMLImageElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { onError, ...rest } = props;

  const failed = () => {
    setStage((s) => {
      if (s === 0) return 1;
      if (s === 1) {
        // Wait a moment before the last attempt: the origin may just be busy.
        timer.current = setTimeout(() => setStage(2), 1500);
        return 1;
      }
      return s === 2 ? 3 : s;
    });
  };

  // An image that failed BEFORE React attached (server-rendered HTML) never fires onError: check it ourselves.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) failed();
  }, [stage]);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (stage === 3 || typeof rest.src !== "string") return typeof rest.src === "string" ? null : // eslint-disable-next-line jsx-a11y/alt-text
    <Image ref={img} {...rest} onError={onError} />;

  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image
      key={stage}
      ref={img}
      {...rest}
      // The direct address keeps working with a changed query, which also sidesteps a cached failure.
      src={stage === 2 ? `${rest.src}${rest.src.includes("?") ? "&" : "?"}r=1` : rest.src}
      unoptimized={stage >= 1 ? true : rest.unoptimized}
      onError={(e) => {
        onError?.(e);
        failed();
      }}
    />
  );
}
