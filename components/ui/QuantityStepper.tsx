"use client";

/** − n + control. 44px targets, announces the new value to screen readers. */
export function QuantityStepper({
  value,
  onChange,
  label,
  min = 0,
  max = 9,
  disabled,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const btn = "h-11 w-[46px] border-0 bg-transparent text-lg disabled:text-[#a99e90]";
  return (
    <div role="group" aria-label={label} className="flex h-[46px] items-center border border-line-strong bg-white">
      <button type="button" aria-label="Decrease quantity" disabled={disabled || value <= min} onClick={() => onChange(value - 1)} className={btn}>
        −
      </button>
      <span aria-live="polite" className="w-7 text-center text-[15px]">
        {value}
      </span>
      <button type="button" aria-label="Increase quantity" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className={btn}>
        +
      </button>
    </div>
  );
}
