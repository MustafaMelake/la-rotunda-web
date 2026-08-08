import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Shared by the PDP header and every review card, so the two can't drift onto
 * different star treatments.
 *
 * Amber is the one non-brand hue on the site. Stars read as gold by convention
 * and a red star would be indistinguishable from the surrounding brand colour,
 * so it earns its place — but it appears nowhere else.
 *
 * The glyphs are `aria-hidden` and the real value is exposed once, as text: five
 * separate star icons announced individually is noise, and rounding to whole
 * stars would misreport a 4.8.
 */
export function StarRating({
  rating,
  className,
  starClassName,
}: {
  rating: number;
  className?: string;
  starClassName?: string;
}) {
  const filled = Math.round(rating);

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={cn(
            "size-4",
            index < filled
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-muted-foreground/40",
            starClassName,
          )}
        />
      ))}
      <span className="sr-only">{rating} out of 5</span>
    </span>
  );
}

export default StarRating;
