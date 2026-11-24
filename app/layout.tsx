import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { AppRail } from "@/components/app-rail";
import { KitchenProvider } from "@/components/kitchen-provider";
import "./globals.css";

const display = DM_Serif_Display({
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  display: "swap",
  variable: "--font-dm-serif",
});

const body = DM_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: { default: "Sinapis: the allergen graph for a restaurant kitchen", template: "%s · Sinapis" },
  description:
    "Sinapis traces every allergen on your menu back through the sauce and the supplier product it came from, and tells you which dishes change the moment a supplier changes a recipe.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen antialiased">
        <KitchenProvider>
          <div className="md:flex">
            <AppRail />
            <main className="min-w-0 flex-1 px-4 pb-28 pt-6 md:px-10 md:pb-12 md:pt-10">{children}</main>
          </div>
        </KitchenProvider>
      </body>
    </html>
  );
}
