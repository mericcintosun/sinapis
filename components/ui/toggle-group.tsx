"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// A single-choice button group in shadcn form, without Radix. Each item is a real button
// with aria-pressed; Tab reaches the group, Left and Right arrows move between items,
// Enter and Space press. No tablist role: the items switch a view, they do not own panels.

interface ToggleGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(null);

function ToggleGroup({
  value,
  onValueChange,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    e.preventDefault();
    const next = items[(at + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length];
    next.focus();
  };
  return (
    <ToggleGroupContext.Provider value={{ value, onValueChange }}>
      <div
        role="group"
        onKeyDown={onKeyDown}
        className={cn("inline-flex items-center gap-1 rounded-md border border-line p-1", className)}
        {...props}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

function ToggleGroupItem({
  value,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "value" | "onClick"> & { value: string }) {
  const ctx = React.useContext(ToggleGroupContext);
  const pressed = ctx?.value === value;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => ctx?.onValueChange(value)}
      className={cn(
        "inline-flex min-h-9 items-center justify-center rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-deep max-md:min-h-11",
        pressed ? "bg-ink text-kiln" : "text-ink hover:bg-surface",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export { ToggleGroup, ToggleGroupItem };
