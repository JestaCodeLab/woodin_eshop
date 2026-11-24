const ICON = "mt-0.5 shrink-0 text-brown";

/** Delivery / payment reassurance rows (copy from the design). */
export function InfoBlocks() {
  return (
    <ul className="m-0 flex list-none flex-col border border-line bg-white p-0 text-sm font-light leading-[1.55]">
      <li className="flex gap-3.5 border-b border-line px-[18px] py-4">
        <svg aria-hidden="true" className={ICON} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" />
        </svg>
        <span>
          <span className="font-medium">Delivery</span> — order within [X] hrs for Accra delivery by [DAY].
        </span>
      </li>
      <li className="flex gap-3.5 px-[18px] py-4">
        <svg aria-hidden="true" className={ICON} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="6" y="2" width="12" height="20" rx="2" />
        </svg>
        <span>
          <span className="font-medium">Pay your way</span> — MTN MoMo, Telecel Cash, AT Money or card.
        </span>
      </li>
    </ul>
  );
}
