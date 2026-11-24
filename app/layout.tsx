import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { AppRail } from "@/components/app-rail";
import { KitchenProvider } from "@/components/kitchen-provider";
import { SITE_URL } from "@/lib/config";
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

// Title claim (five words) matches the claim line in app/opengraph-image.tsx.
const TITLE = "Sinapis: allergens traced to the supplier";
// 145 characters: the problem, then the fix.
const DESCRIPTION =
  "Supplier recipe changes hide allergens in nested sauces. Sinapis traces every flag to its product and lists the reached dishes before you accept.";

function siteBase(): URL {
  try {
    return new URL(SITE_URL);
  } catch {
    return new URL("https://sinapis-nine.vercel.app");
  }
}

export const metadata: Metadata = {
  metadataBase: siteBase(),
  title: { default: TITLE, template: "%s | Sinapis" },
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "Sinapis" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen antialiased">
        <KitchenProvider>
          <div className="md:flex">
            <AppRail />
            <main className="min-w-0 flex-1 px-4 pb-28 pt-6 md:px-10 md:pb-12 md:pt-10">
              {children}
              <p className="mx-auto mt-12 max-w-6xl text-xs text-ink/75 md:hidden">
                Decision support, not a medical guarantee. A missing spec sheet is never treated as allergen free.
              </p>
            </main>
          </div>
        </KitchenProvider>
      </body>
    </html>
  );
}
