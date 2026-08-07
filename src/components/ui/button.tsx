import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * shadcn/ui Button, Tailwind v4 flavour (data-slot, `size-*`, token colours).
 *
 * Two La Rotunda additions on top of the stock variants:
 *  - `brand`  — the solid red pill. The single primary action on a surface.
 *  - `onDark` — hairline white outline, for sitting on photography where the
 *               token `outline` variant would vanish into the image.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold outline-none transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",

        // Uses `primary`, not the fixed `brand-red`: this variant lands on
        // light AND dark grounds, and `primary` is the token that lifts in
        // dark mode. Reserve `brand-red` for permanently-dark surfaces.
        brand:
          "bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary/90 active:translate-y-px",
        onDark:
          "border border-white/35 bg-white/5 text-white backdrop-blur-sm hover:border-white/70 hover:bg-white/15 focus-visible:ring-white/40 active:translate-y-px",
        onBrand:
          "bg-white text-brand-red shadow-lg shadow-black/20 hover:bg-white/90 focus-visible:ring-white/50 active:translate-y-px",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        /** Pill CTAs — the house shape, from the navbar to the hero. */
        pill: "h-10 rounded-full px-5 text-xs uppercase tracking-[0.14em]",
        pillLg:
          "h-12 rounded-full px-7 text-xs uppercase tracking-[0.14em] sm:h-14 sm:px-9 sm:text-sm",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
