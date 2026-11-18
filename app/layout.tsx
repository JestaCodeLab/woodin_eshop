import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Jost } from "next/font/google";
import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/layout/Footer";
import { PageLoader } from "@/components/layout/PageLoader";
import { JsonLd } from "@/components/seo/JsonLd";
import { MAIN_LINKS } from "@/lib/links";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";
import "./globals.css";

// Display face: DM Serif Display (single weight, regular + italic). Swap for the licensed
// Le Jeune Deck with next/font/local and keep the --font-dm-serif variable name
// (or update --font-display in globals.css).
const displayFont = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: "%s · Woodin" },
  description: DEFAULT_DESCRIPTION,
  applicationName: "Woodin Shop",
  // Pages set their own canonical URL. Title/description for link previews flow in from each page.
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_GH" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  themeColor: "#521B0A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${displayFont.variable} ${jost.variable}`}>
      <body className="flex min-h-dvh flex-col bg-ivory font-text text-ink">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": absoluteUrl("/#organization"),
                name: SITE_NAME,
                alternateName: "Woodin Le créateur",
                url: MAIN_LINKS.home,
                logo: absoluteUrl("/icon-512.png"),
              },
              {
                "@type": "WebSite",
                "@id": absoluteUrl("/#website"),
                name: "Woodin Shop",
                url: SITE_URL,
                inLanguage: "en-GH",
                publisher: { "@id": absoluteUrl("/#organization") },
                potentialAction: {
                  "@type": "SearchAction",
                  target: { "@type": "EntryPoint", urlTemplate: absoluteUrl("/shop?q={search_term_string}") },
                  "query-input": "required name=search_term_string",
                },
              },
            ],
          }}
        />
        <PageLoader />
        <CartProvider>
          <div className="flex-1">{children}</div>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
