"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, LayoutGrid, UtensilsCrossed } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { REPO_URL } from "@/lib/config";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/dishes", label: "Dishes", icon: UtensilsCrossed },
  { href: "/activity", label: "Activity", icon: BookOpenText },
];

// The overview's own sections, listed under Overview in the desktop rail. The one in
// view is marked with aria-current="location" while the chef scrolls.
const OVERVIEW_SECTIONS = [
  { id: "load", label: "Allergen load" },
  { id: "matrix", label: "Allergen matrix" },
];

function routeMatches(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function useSectionInView(enabled: boolean): string | null {
  const [inView, setInView] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") return;
    const els = OVERVIEW_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (els.length === 0) return;
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let best: string | null = null;
        let ratio = 0;
        for (const s of OVERVIEW_SECTIONS) {
          const r = visible.get(s.id) ?? 0;
          if (r > ratio) {
            best = s.id;
            ratio = r;
          }
        }
        setInView(best);
      },
      { threshold: [0, 0.15, 0.4, 0.7], rootMargin: "-80px 0px -35% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [enabled]);
  return enabled ? inView : null;
}

// The rail: mark, sections, one primary action. Sticky left column on desktop;
// on mobile it is a sticky top bar and the section nav docks to the bottom edge.
export function AppRail() {
  const pathname = usePathname();
  const onOverview = pathname === "/";
  const inView = useSectionInView(onOverview);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-background px-4 py-3 md:h-screen md:w-64 md:shrink-0 md:flex-col md:items-stretch md:justify-start md:gap-8 md:border-b-0 md:border-r md:px-5 md:py-6">
      <Link href="/" className="flex items-center gap-2.5 font-display text-2xl text-ink">
        <BrandMark size={32} />
        Sinapis
      </Link>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-background pb-[env(safe-area-inset-bottom)] md:static md:flex-col md:gap-1 md:border-t-0 md:pb-0"
      >
        {SECTIONS.map(({ href, label, icon: Icon }) => {
          const active = routeMatches(pathname, href);
          return (
            <React.Fragment key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 px-3 py-2.5 text-xs font-medium text-ink/85 md:flex-none md:flex-row md:justify-start md:gap-3 md:rounded-md md:text-sm",
                  active ? "bg-surface text-ink" : "hover:bg-surface/60 hover:text-ink",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
              {href === "/" && onOverview && (
                <ul className="hidden md:mb-1 md:ml-5 md:block md:space-y-0.5 md:border-l md:border-line md:pl-3">
                  {OVERVIEW_SECTIONS.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        aria-current={inView === s.id ? "location" : undefined}
                        className={cn(
                          "flex min-h-9 items-center rounded-md px-2 text-sm transition-colors",
                          inView === s.id ? "bg-deep text-ink" : "text-ink/85 hover:bg-surface/60",
                        )}
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="md:mt-auto md:space-y-3">
        <Button asChild variant="default" size="sm" className="min-h-11 md:h-11 md:w-full md:text-sm">
          <Link href="/activity#log-change">Log supplier change</Link>
        </Button>
        <div className="hidden space-y-1 text-xs leading-relaxed text-ink md:block">
          <p>Decision support, not a medical guarantee. A missing spec sheet is never treated as allergen free.</p>
          <a
            href={REPO_URL}
            className="inline-flex min-h-9 items-center underline decoration-line underline-offset-4 hover:decoration-ink"
          >
            Source on GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
