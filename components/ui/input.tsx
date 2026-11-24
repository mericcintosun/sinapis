import * as React from "react";
import { cn } from "@/lib/utils";

// Inputs sit on cream cards: cream field, kiln ink, soft corners, no shadow.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full max-w-full rounded-md max-md:min-h-11 border border-kiln/25 bg-ink px-3 text-sm text-kiln placeholder:text-kiln/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kiln disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
