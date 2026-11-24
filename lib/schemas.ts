// Zod schemas for the API edge. Every handler under app/api/ calls safeParse first.
import { z } from "zod";
import { ALLERGEN_CODES } from "@/lib/data";

export const allergenCodeSchema = z.enum(ALLERGEN_CODES);

export const specChangeSchema = z.object({
  productId: z.string().trim().min(1, "productId must be a non-empty string"),
  allergen: allergenCodeSchema,
  kind: z.enum(["contains", "may", "clear"]),
  note: z.string().max(280).optional(),
});

export const guestSchema = z.object({
  allergens: z.array(allergenCodeSchema).max(ALLERGEN_CODES.length),
});

export const dishIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "dish ids are lowercase words joined by hyphens");

export type SpecChangeInput = z.infer<typeof specChangeSchema>;

/** One short, payload-free hint from a zod error: the first failing field and its message. */
export function hintOf(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "Invalid input.";
  const field = first.path.length ? first.path.join(".") : "body";
  return `${field}: ${first.message}`;
}
