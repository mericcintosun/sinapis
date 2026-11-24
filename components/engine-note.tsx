"use client";

import type { AdapterMode, Engine } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NoteEngine = Engine | "pending";

const LABEL: Record<NoteEngine, string> = {
  "local-mirror": "Local mirror",
  "relate-wasm": "Live engine",
  pending: "Asking Relate",
};

// The mirror sentence depends on why the mirror answered: in real mode it is a fallback
// after Relate could not load or answer in this browser; in fake mode it was chosen.
function sentence(engine: NoteEngine, mode: AdapterMode): string {
  if (engine === "relate-wasm") return "Live engine: Relate (WASM, stored in this browser with OPFS).";
  if (engine === "pending") return "Drawn from the seed replay while Relate answers in this browser.";
  return mode === "real"
    ? "Relate could not open in this browser, so the local graph mirror answered from the same seed."
    : "Answered by the local graph mirror (ADAPTER_MODE=fake), not by Relate.";
}

// Says in words which engine produced the answer next to it. The text is picked from the
// engine value the adapter returned, so a fallback to the mirror is never labelled Relate.
export function EngineNote({
  engine,
  mode,
  className,
}: {
  engine: NoteEngine;
  mode: AdapterMode;
  className?: string;
}) {
  return (
    <p
      className={cn("sinapis-rise flex flex-wrap items-center gap-2 text-xs", className)}
      data-engine={engine}
      data-mode={mode}
      aria-live="polite"
    >
      <Badge variant="default">{LABEL[engine]}</Badge>
      <span>{sentence(engine, mode)}</span>
    </p>
  );
}
