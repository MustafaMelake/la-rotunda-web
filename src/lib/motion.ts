import type { Variants } from "framer-motion";

/**
 * Shared motion tokens.
 *
 * The easing lives in one place deliberately: three sections reveal on the same
 * page, and nothing makes a build feel unfinished faster than bands that settle
 * on slightly different curves. Typed as a mutable 4-tuple because that is what
 * framer-motion's `BezierDefinition` expects — `as const` would widen to
 * `readonly` and fail to assign.
 */
export const EASE_PREMIUM: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Long, unhurried settle for hero-scale reveals. */
export const DURATION_SLOW = 0.9;
/** Default for body copy and cards. */
export const DURATION_BASE = 0.7;

/**
 * Parent that releases its children one after another. Carries no visual state
 * of its own, so it never fights the child variants.
 */
export function staggerParent(stagger = 0.12, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  };
}

/**
 * Fade and rise. `reduce` collapses the travel to zero but keeps the opacity
 * change, so the reveal still reads as a reveal without any motion.
 *
 * The transition lives INSIDE the `show` variant so it can't be clobbered by a
 * `transition` prop set on the same element for a hover spring.
 */
export function fadeUp(
  reduce: boolean,
  distance = 28,
  duration = DURATION_BASE,
): Variants {
  return {
    hidden: { opacity: 0, y: reduce ? 0 : distance },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration, ease: EASE_PREMIUM },
    },
  };
}

/**
 * A word rising out of its own clipping box. The parent span must carry
 * `overflow-hidden`; this animates the inner span up from fully below it.
 */
export function wordReveal(reduce: boolean): Variants {
  return {
    hidden: { y: reduce ? 0 : "110%", opacity: reduce ? 0 : 1 },
    show: {
      y: "0%",
      opacity: 1,
      transition: { duration: DURATION_SLOW, ease: EASE_PREMIUM },
    },
  };
}
