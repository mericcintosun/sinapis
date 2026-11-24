"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, LayoutGrid, UtensilsCrossed } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/dishes", label: "Dishes", icon: UtensilsCrossed },
  { href: "/activity", label: "Change log", icon: BookOpenText },
];

// The rail: mark, sections, one primary action. Sticky left column on desktop;
// on mobile it is a sticky top bar and the section nav docks to the bottom edge.
export function AppRail() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-background px-4 py-3 md:h-screen md:w-64 md:shrink-0 md:flex-col md:items-stretch md:justify-start md:gap-8 md:border-b-0 md:border-r md:px-5 md:py-6">
      <Link href="/" className="flex items-center gap-2.5 font-display text-2xl text-ink">
        <BrandMark size={32} />
        Sinapis
      </Link>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-background md:static md:flex-col md:gap-1 md:border-t-0"
      >
        {SECTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 px-3 py-2.5 text-xs font-medium text-ink/80 md:flex-none md:flex-row md:gap-3 md:rounded-md md:text-sm",
              isActive(href) ? "bg-surface text-ink" : "hover:bg-surface/60 hover:text-ink",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <div className="md:mt-auto md:space-y-3">
        <Button asChild variant="default" size="sm" className="md:h-11 md:w-full md:text-sm">
          <Link href="/activity#log-change">Log supplier change</Link>
        </Button>
        <p className="hidden text-xs leading-relaxed text-ink/75 md:block">
          Decision support for the chef. It never treats a missing spec sheet as allergen free.
        </p>
      </div>
    </header>
  );
}
