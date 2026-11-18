"use client";

import { useId, useState } from "react";

export interface AccordionItem {
  title: string;
  body: string;
}

/** Single-open accordion (product page panels). */
export function Accordion({ items, defaultOpen = 0 }: { items: AccordionItem[]; defaultOpen?: number | null }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const uid = useId();
  return (
    <div className="flex flex-col border-t border-line">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.title} className="border-b border-line">
            <h3 className="m-0">
              <button
                type="button"
                id={`${uid}-h${i}`}
                aria-expanded={isOpen}
                aria-controls={`${uid}-p${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="label-caps flex min-h-[58px] w-full items-center justify-between border-0 bg-transparent p-0 text-left tracking-[0.18em] text-ink"
              >
                {item.title}
                <span aria-hidden="true" className="text-lg font-light">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h3>
            <div id={`${uid}-p${i}`} role="region" aria-labelledby={`${uid}-h${i}`} hidden={!isOpen}>
              <p className="m-0 mb-[18px] text-[15px] font-light leading-[1.7] text-body">{item.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
