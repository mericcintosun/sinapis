// Names of the uploaded brand images (without ".png"), listed by next.config.ts at build time.
import { BRAND_FILES } from "@/lib/config";

const files = new Set(BRAND_FILES.split(",").filter(Boolean));

/** True when public/brand/<name>.png was present at build time ("logo", "scene-1", ...). */
export function hasBrandFile(name: string): boolean {
  return files.has(name);
}
