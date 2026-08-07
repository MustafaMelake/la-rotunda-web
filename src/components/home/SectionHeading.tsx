"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * The section header shared by every homepage band: a red status dot, a small
 * label, the Anton title, and an optional standfirst.
 *
 * Lives in its own file on purpose — several sections need it and inlining it
 * per-section guarantees they drift apart on the first tweak.
 *
 *  - `align` — the About band sets the same header ragged-left beside its arch.
 *  - `tone`  — `onBrand` flips it to light-on-red for the Testimonials band,
 *              where the default muted/foreground tokens would be unreadable.
 */
export function SectionHeading({
  label,
  title,
  align = "center",
  tone = "default",
  className,
  children,
}: {
  label: string;
  title: string;
  align?: "center" | "left";
  tone?: "default" | "onBrand";
  className?: string;
  children?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const centered = align === "center";
  const onBrand = tone === "onBrand";

  return (
    <motion.header
      initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn(centered ? "mx-auto max-w-2xl text-center" : "text-left", className)}
    >
      <p
        className={cn(
          "flex items-center gap-2.5 text-sm font-semibold",
          centered && "justify-center",
          onBrand ? "text-white/75" : "text-muted-foreground",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-2 shrink-0 rounded-full",
            onBrand ? "bg-white" : "bg-primary",
          )}
        />
        {label}
      </p>

      <h2
        className={cn(
          "font-display mt-4 text-balance text-[clamp(1.9rem,5.5vw,3.5rem)] leading-[0.95]",
          onBrand && "text-white",
        )}
      >
        {title}
      </h2>

      {children ? (
        <p
          className={cn(
            "mt-5 text-pretty leading-relaxed",
            onBrand ? "text-white/80" : "text-muted-foreground",
          )}
        >
          {children}
        </p>
      ) : null}
    </motion.header>
  );
}

export default SectionHeading;
