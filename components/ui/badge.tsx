import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Status badges. OK / WARN / BAD fills mark allergen state only, never brand.
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "bg-kiln text-on-kiln",
        outline: "border border-line text-ink",
        contains: "bg-bad text-kiln",
        may: "bg-warn text-kiln",
        unknown: "border border-dashed border-kiln bg-ink text-kiln",
        free: "bg-ok text-kiln",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
