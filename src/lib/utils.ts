import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional classes, letting later Tailwind utilities win over earlier
 * ones. Required by every shadcn primitive. Safe in Client Components — this
 * module has no server-only dependency (unlike `@/lib/action-utils`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Canonical slug. Non-latin input yields "" — supply your own fallback. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Only ever follow a same-origin, absolute-path redirect. */
export function sanitizeRedirect(value: string | null, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
