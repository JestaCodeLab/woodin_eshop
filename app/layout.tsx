import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

// Display face. Swap for the licensed Le Jeune Deck with next/font/local and
// keep the --font-bodoni variable name (or update --font-display in globals.css).
const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
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
    <html lang="en" className={`${bodoni.variable} ${jost.variable}`}>
      <body className="flex min-h-dvh flex-col bg-ivory font-text text-ink">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
