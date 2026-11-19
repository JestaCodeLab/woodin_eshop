import Image from "next/image";
import Link from "next/link";
import { LOGO } from "@/lib/images";
import { isExternal, shopHref } from "@/lib/links";
import { SOCIAL_LINKS, type SocialKey } from "@/lib/social";
import { NewsletterForm } from "./NewsletterForm";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Men", href: shopHref("men") },
      { label: "Women", href: shopHref("women") },
      { label: "Fabrics", href: shopHref("fabrics") },
    ],
  },
  {
    // TODO: point at the real help pages once Woodin has them (see TODO.md).
    title: "Help",
    links: [
      { label: "Track your order", href: "/track" },
      { label: "Delivery & returns", href: "#" },
      { label: "Size guide", href: "#" },
      { label: "FAQs", href: "#" },
      { label: "Contact us", href: "#" },
    ],
  },
  {
    title: "Stores",
    links: [
      { label: "Store locator", href: "/stores" },
      { label: "Click & collect", href: "/stores" },
      { label: "Wholesale enquiries", href: "#" },
    ],
  },
];

const ICONS: Record<SocialKey, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" />
    </>
  ),
  facebook: <path d="M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />,
  x: <path d="M4 4l16 16M20 4L4 20" />,
  youtube: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9l5 3-5 3z" />
    </>
  ),
};

const PAYMENT_BADGES = [
  { name: "MTN MoMo", logo: "/payments/mtn.png" },
  { name: "Telecel Cash", logo: "/payments/telecel.png" },
  { name: "AT Money", logo: "/payments/at.png" },
  { name: "Visa", logo: "/payments/visa.png", wide: true },
];

export function Footer() {
  return (
    <footer className="w-full bg-brown text-[#e9ded0]">
      <div className="border-b border-ivory/[0.18]">
        <div className="content-wrap flex flex-wrap items-center justify-between gap-7 py-10 md:py-12">
          <div className="flex min-w-0 flex-1 basis-[420px] flex-col gap-2">
            <span className="font-display text-[clamp(30px,4vw,40px)] leading-[1.05] text-ivory">
              Join the Woodin Nation
            </span>
            <label htmlFor="ft-email" className="text-[15px] font-light leading-normal">
              New drops first, styling notes from the studio.
            </label>
          </div>
          <NewsletterForm />
        </div>
      </div>

      <div className="content-wrap flex flex-wrap gap-x-12 gap-y-10 pb-10 pt-14">
        <div className="flex min-w-0 flex-[1.4_1_260px] flex-col gap-[18px]">
          <Image
            src={LOGO.footer.src}
            width={LOGO.footer.width}
            height={LOGO.footer.height}
            alt="Woodin Le créateur"
            className="h-auto w-[96px]"
          />
          <p className="m-0 max-w-[300px] text-sm font-light leading-[1.7]">
            Wax prints and ready-to-wear designed for those who wear their identity with confidence.
          </p>
          <div className="flex gap-1">
            {SOCIAL_LINKS.map((l) => (
              <SocialLink key={l.key} label={l.label} href={l.href}>
                {ICONS[l.key]}
              </SocialLink>
            ))}
          </div>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-[1_1_160px] flex-col gap-3 text-sm font-light">
            <span className="label-caps mb-1 tracking-[0.18em] text-ivory">{col.title}</span>
            {col.links.map((l) => {
              const cls = "inline-block py-0.5 text-[#e9ded0] no-underline hover:text-white hover:underline";
              return isExternal(l.href) ? (
                <a key={l.label} href={l.href} className={cls}>
                  {l.label}
                </a>
              ) : (
                <Link key={l.label} href={l.href} className={cls}>
                  {l.label}
                </Link>
              );
            })}
          </nav>
        ))}
      </div>

      <div className="border-t border-ivory/[0.18]">
        <div className="content-wrap flex flex-wrap items-center justify-between gap-3.5 pb-7 pt-[22px] text-xs tracking-[0.06em]">
          <span>© 2026 Woodin. All rights reserved.</span>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Accepted payment methods">
            {PAYMENT_BADGES.map((p) => (
              <li key={p.name} className={`h-9 overflow-hidden bg-white ${"wide" in p ? "w-[104px] px-2.5" : "w-9"}`}>
                <Image src={p.logo} alt={p.name} width={80} height={56} unoptimized className={`h-full w-full ${"wide" in p ? "object-contain" : "object-cover"}`} />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-5">
            <Link href="#" className="text-[#e9ded0] underline-offset-4 hover:underline">Terms &amp; Conditions</Link>
            <Link href="#" className="text-[#e9ded0] underline-offset-4 hover:underline">Privacy Policy</Link>
            <Link href="#" className="text-[#e9ded0] underline-offset-4 hover:underline">English / Français</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ label, href, children }: { label: string; href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (opens in a new tab)`}
      className="flex h-11 w-11 items-center justify-center border border-ivory/35 text-ivory"
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        {children}
      </svg>
    </a>
  );
}
