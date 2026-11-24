"use client";

import type { AdapterMode, Engine } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LABEL: Record<Engine, string> = {
  "local-mirror": "Sample data",
  "relate-wasm": "Live engine",
};

const SENTENCE: Record<Engine, string> = {
  "local-mirror": "Sample data: answered by the local graph mirror, not by Relate.",
  "relate-wasm": "Live engine: Relate (WASM, stored in this browser with OPFS).",
};

// Says in words which engine produced the answer next to it. The text is picked from the
// engine value the adapter returned, so a fallback to the mirror is never labelled Relate.
export function EngineNote({
  engine,
  mode,
  className,
}: {
  engine: Engine;
  mode: AdapterMode;
  className?: string;
}) {
  return (
    <p
      className={cn("sinapis-rise flex flex-wrap items-center gap-2 text-xs", className)}
      data-engine={engine}
      data-mode={mode}
    >
      <Badge variant="default">{LABEL[engine]}</Badge>
      <span>{SENTENCE[engine]}</span>
    </p>
  );
}
