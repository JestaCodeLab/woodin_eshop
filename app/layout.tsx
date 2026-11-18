import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Jost } from "next/font/google";
import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/layout/Footer";
import { PageLoader } from "@/components/layout/PageLoader";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Woodin — Le créateur", template: "%s · Woodin" },
  description:
    "Wax prints and ready-to-wear designed for those who wear their identity with confidence.",
};

export const viewport: Viewport = {
  themeColor: "#521B0A",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${displayFont.variable} ${jost.variable}`}>
      <body className="flex min-h-dvh flex-col bg-ivory font-text text-ink">
        <PageLoader />
        <CartProvider>
          <div className="flex-1">{children}</div>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
