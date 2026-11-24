"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// The shared error and empty branches of every demo route. Cream cards on the block,
// existing tokens only, the one entrance keyframe (sinapis-rise). Skeletons live in
// components/ui/skeleton.tsx.

/** Something failed and nothing was written. The retry re-issues the same call. */
export function ErrorState({
  title,
  hint,
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  title: string;
  hint: string;
  onRetry: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <Card role="alert" className={cn("sinapis-rise", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="max-w-[68ch]">{hint}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onRetry}>{retryLabel}</Button>
      </CardContent>
    </Card>
  );
}

/** Nothing to show yet, plus the next demo click. */
export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("sinapis-rise", className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {hint && <CardDescription className="max-w-[68ch]">{hint}</CardDescription>}
      </CardHeader>
      {action && <CardContent className="flex flex-wrap gap-3">{action}</CardContent>}
    </Card>
  );
}
