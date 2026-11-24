import * as React from "react";
import { cn } from "@/lib/utils";

// Native select in the same clayblock form as Input.
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-kiln/25 bg-ink px-3 text-sm text-kiln focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kiln disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Select };
