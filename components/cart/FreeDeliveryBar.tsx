import { formatMoney } from "@/lib/format";

/**
 * "You are GH₵ X away from free Accra delivery" + progress bar.
 * With no threshold configured it shows the design's [X] placeholder and an empty bar.
 */
export function FreeDeliveryBar({
  subtotal,
  threshold,
  currency = "GHS",
}: {
  subtotal: number | null;
  threshold: number | null;
  currency?: string;
}) {
  const known = threshold !== null && subtotal !== null;
  const reached = known && subtotal >= threshold;
  const pct = known ? Math.min(100, Math.round((subtotal / threshold) * 100)) : 0;

  const label = reached
    ? "You have unlocked free Accra delivery."
    : known
      ? `You are ${formatMoney(threshold - subtotal, currency)} away from free Accra delivery.`
      : "You are GH₵ [X] away from free Accra delivery.";

  return (
    <div role="status" className="flex flex-col gap-2.5 border border-line bg-white px-5 py-[18px]">
      <span className="text-[15px] font-light">{label}</span>
      <span aria-hidden="true" className="block h-[3px] bg-line">
        <span
          className={`block h-[3px] transition-[width] duration-500 ${reached ? "bg-instock-dot" : "bg-brown"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
