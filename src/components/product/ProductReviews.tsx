"use client";

import { motion, useReducedMotion } from "framer-motion";

import { SectionHeading } from "@/components/home/SectionHeading";
import { StarRating } from "@/components/product/StarRating";
import type { ReviewMock } from "@/components/product/product-data";
import { averageRating } from "@/components/product/product-data";
import { fadeUp, staggerParent } from "@/lib/motion";

/**
 * Fixed locale and UTC time zone on purpose. `toLocaleDateString()` with no
 * arguments formats against the *server's* locale during prerender and the
 * *visitor's* on hydration, which is a guaranteed React hydration mismatch on a
 * statically generated page.
 */
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function ProductReviews({ reviews }: { reviews: readonly ReviewMock[] }) {
  const reduceMotion = useReducedMotion();
  const rating = averageRating(reviews);

  return (
    <section className="bg-muted/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading label="Reviews" title="What our clients say">
          {reviews.length > 0 ? (
            <>
              Averaging <span className="num font-semibold text-foreground">{rating}</span>{" "}
              out of 5 across {reviews.length} review
              {reviews.length === 1 ? "" : "s"}. Only reviews we&apos;ve checked
              appear here.
            </>
          ) : (
            <>No reviews yet. Order it and tell us what you think.</>
          )}
        </SectionHeading>

        {reviews.length > 0 ? (
          <motion.ul
            variants={staggerParent(0.12, 0.05)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {reviews.map((review) => (
              <motion.li
                key={review.id}
                variants={fadeUp(Boolean(reduceMotion), 28)}
                whileHover={reduceMotion ? undefined : { y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="group relative flex flex-col overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-border sm:p-7"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-primary transition-transform duration-500 group-hover:scale-x-100"
                />

                <StarRating rating={review.rating} />

                <blockquote className="mt-4 flex-1 text-pretty leading-relaxed text-muted-foreground">
                  {review.comment}
                </blockquote>

                <footer className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                  {/* Monogram, not a photo: `Review` has no avatar column, and
                      `user.image` is nullable, so this is the honest default. */}
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground"
                  >
                    {review.authorName.charAt(0)}
                  </span>
                  <span className="min-w-0">
                    {/* The submission-time snapshot — never the live user name. */}
                    <cite className="block truncate text-sm font-semibold not-italic">
                      {review.authorName}
                    </cite>
                    <time
                      dateTime={review.createdAt}
                      className="num text-xs text-muted-foreground"
                    >
                      {DATE_FORMAT.format(new Date(review.createdAt))}
                    </time>
                  </span>
                </footer>
              </motion.li>
            ))}
          </motion.ul>
        ) : null}
      </div>
    </section>
  );
}

export default ProductReviews;
