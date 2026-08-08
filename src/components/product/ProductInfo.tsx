"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { StarRating } from "@/components/product/StarRating";
import type { ModifierGroupMock, ProductMock } from "@/components/product/product-data";
import { averageRating } from "@/components/product/product-data";
import { Button } from "@/components/ui/button";
import { fadeUp, staggerParent } from "@/lib/motion";
import { roundMoney } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { CHECKOUT_MAX_QUANTITY } from "@/lib/validators";

type Selection = Record<string, string[]>;

/** Pre-select the first available option of each required group. */
function initialSelection(groups: readonly ModifierGroupMock[]): Selection {
  const selection: Selection = {};
  for (const group of groups) {
    selection[group.id] =
      group.isRequired || group.minSelect > 0
        ? [group.options.find((option) => option.isAvailable)?.id].filter(
            (id): id is string => Boolean(id),
          )
        : [];
  }
  return selection;
}

export function ProductInfo({ product }: { product: ProductMock }) {
  const reduceMotion = useReducedMotion();

  const [variantId, setVariantId] = React.useState(
    () => product.variants.find((variant) => variant.isAvailable)?.id ?? product.variants[0].id,
  );
  const [selection, setSelection] = React.useState<Selection>(() =>
    initialSelection(product.modifierGroups),
  );
  const [quantity, setQuantity] = React.useState(1);
  const [isPending, startTransition] = React.useTransition();

  const variant =
    product.variants.find((candidate) => candidate.id === variantId) ?? product.variants[0];

  const selectedOptionIds = React.useMemo(
    () => Object.values(selection).flat(),
    [selection],
  );

  /**
   * The line price, in the one order the charter fixes: variant base first, then
   * the modifier deltas added on top, and the whole thing rounded ONCE. Deltas
   * are never rounded individually and are never themselves discounted — a
   * half-price promotion must not also halve a stuffed-crust upcharge.
   *
   * `resolvePrice` is still a TODO in src/lib/pricing.ts, so no promotion is
   * applied here yet. When it lands, the discounted base replaces `variant.price`
   * below and nothing else about this expression changes.
   */
  const deltaTotal = React.useMemo(() => {
    const byId = new Map(
      product.modifierGroups.flatMap((group) =>
        group.options.map((option) => [option.id, option.priceDelta] as const),
      ),
    );
    return selectedOptionIds.reduce((sum, id) => sum + (byId.get(id) ?? 0), 0);
  }, [product.modifierGroups, selectedOptionIds]);

  const lineUnit = roundMoney(variant.price + deltaTotal);
  const lineTotal = roundMoney(lineUnit * quantity);

  /**
   * Sorted, comma-joined option ids — the cart line identity, paired with the
   * variant id. Sorting makes it order-independent so the same selection always
   * yields the same signature. Computed here only for local store keying; the
   * server recomputes it from validated ids and never trusts this string.
   */
  const modifierSignature = React.useMemo(
    () => [...selectedOptionIds].sort().join(","),
    [selectedOptionIds],
  );

  /** Groups whose min/max rules aren't satisfied. Postgres can't enforce these. */
  const unmetGroups = product.modifierGroups.filter((group) => {
    const chosen = selection[group.id]?.length ?? 0;
    const min = group.isRequired ? Math.max(1, group.minSelect) : group.minSelect;
    return chosen < min;
  });

  function toggleOption(group: ModifierGroupMock, optionId: string) {
    setSelection((previous) => {
      const chosen = previous[group.id] ?? [];

      if (chosen.includes(optionId)) {
        // A required single-select can't be emptied by clicking the active pill.
        if (group.maxSelect === 1 && (group.isRequired || group.minSelect > 0)) {
          return previous;
        }
        return { ...previous, [group.id]: chosen.filter((id) => id !== optionId) };
      }

      if (group.maxSelect === 1) return { ...previous, [group.id]: [optionId] };
      if (chosen.length >= group.maxSelect) return previous; // at cap
      return { ...previous, [group.id]: [...chosen, optionId] };
    });
  }

  function handleAddToCart() {
    startTransition(() => {
      // TODO(la-rotunda): await addToCart({ variantId, quantity, modifierOptionIds })
      // The payload carries ids and intent only — never a price and never a
      // priceDelta. The server re-resolves both halves at bill time.
      toast.info("The cart isn't connected yet", {
        description: `Would send variant ${variant.name} ×${quantity}${
          selectedOptionIds.length > 0
            ? ` with ${selectedOptionIds.length} option${selectedOptionIds.length === 1 ? "" : "s"}`
            : ""
        }.`,
      });
    });
  }

  const rating = averageRating(product.reviews);

  return (
    <section className="bg-background pb-16 pt-10 sm:pb-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left: the plate. */}
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            whileHover={reduceMotion ? undefined : { scale: 1.01 }}
            className="corner-sheen relative aspect-square overflow-hidden rounded-[2rem] bg-muted ring-1 ring-border"
          >
            <Image
              src={product.image}
              alt={product.name}
              fill
              preload
              quality={90}
              sizes="(min-width: 1024px) 40rem, 90vw"
              className="object-cover transition-transform duration-700 hover:scale-[1.04]"
            />
          </motion.div>

          {/* Right: everything you decide before adding it. */}
          <motion.div
            variants={staggerParent(0.08, 0.1)}
            initial="hidden"
            animate="show"
          >
            <motion.div
              variants={fadeUp(Boolean(reduceMotion), 18)}
              className="flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              <span className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                {product.categoryName}
              </span>

              <span className="flex items-center gap-2">
                <StarRating rating={rating} />
                <span className="num text-sm text-muted-foreground">
                  {rating} · {product.reviews.length} review
                  {product.reviews.length === 1 ? "" : "s"}
                </span>
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp(Boolean(reduceMotion), 24)}
              className="font-display mt-5 text-balance text-[clamp(2rem,5vw,3.5rem)] leading-[0.95]"
            >
              {product.name}
            </motion.h1>

            {/* Hero price. `.num` throughout: these values change at runtime and
                must never reflow as digits are added. */}
            <motion.div
              variants={fadeUp(Boolean(reduceMotion), 20)}
              className="mt-4 flex flex-wrap items-baseline gap-3"
            >
              <p className="num text-3xl font-bold text-primary sm:text-4xl">
                EGP {lineUnit}
              </p>
              {variant.compareAtPrice && variant.compareAtPrice > variant.price ? (
                <p className="num text-lg text-muted-foreground line-through">
                  EGP {variant.compareAtPrice}
                </p>
              ) : null}
              {deltaTotal !== 0 ? (
                <p className="num text-sm text-muted-foreground">
                  base EGP {variant.price} + extras EGP {roundMoney(deltaTotal)}
                </p>
              ) : null}
            </motion.div>

            <motion.p
              variants={fadeUp(Boolean(reduceMotion), 20)}
              className="mt-5 max-w-prose text-pretty leading-relaxed text-muted-foreground"
            >
              {product.description}
            </motion.p>

            {/* Variants. Price lives here, not on the product. */}
            {product.variants.length > 1 ? (
              <motion.fieldset variants={fadeUp(Boolean(reduceMotion), 20)} className="mt-8">
                <legend className="text-sm font-semibold">Size</legend>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {product.variants.map((candidate) => (
                    <label
                      key={candidate.id}
                      className={cn(
                        "cursor-pointer",
                        !candidate.isAvailable && "cursor-not-allowed opacity-40",
                      )}
                    >
                      <input
                        type="radio"
                        name="variant"
                        value={candidate.id}
                        checked={candidate.id === variantId}
                        disabled={!candidate.isAvailable}
                        onChange={() => setVariantId(candidate.id)}
                        className="peer sr-only"
                      />
                      <span className="num block rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50">
                        {candidate.name} · EGP {candidate.price}
                      </span>
                    </label>
                  ))}
                </div>
              </motion.fieldset>
            ) : null}

            {/* Modifier groups. Native inputs restyled, so keyboard and screen
                reader behaviour comes for free — a div with onClick would not. */}
            {product.modifierGroups.map((group) => {
              const chosen = selection[group.id] ?? [];
              const single = group.maxSelect === 1;
              const atCap = !single && chosen.length >= group.maxSelect;

              return (
                <motion.fieldset
                  key={group.id}
                  variants={fadeUp(Boolean(reduceMotion), 20)}
                  className="mt-8"
                >
                  <legend className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {group.name}
                    {group.isRequired ? (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-accent-foreground">
                        Required
                      </span>
                    ) : (
                      <span className="text-xs font-normal text-muted-foreground">
                        {single ? "pick one" : `up to ${group.maxSelect}`}
                      </span>
                    )}
                  </legend>

                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {group.options.map((option) => {
                      const active = chosen.includes(option.id);
                      const blocked = !option.isAvailable || (atCap && !active);

                      return (
                        <label
                          key={option.id}
                          className={cn(
                            "cursor-pointer",
                            blocked && "cursor-not-allowed opacity-40",
                          )}
                        >
                          <input
                            type={single ? "radio" : "checkbox"}
                            name={single ? group.id : undefined}
                            checked={active}
                            disabled={blocked}
                            onChange={() => toggleOption(group, option.id)}
                            className="peer sr-only"
                          />
                          <span className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm transition-colors peer-checked:border-primary peer-checked:bg-accent peer-checked:font-semibold peer-checked:text-accent-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50">
                            {option.name}
                            {option.priceDelta !== 0 ? (
                              <span className="num text-xs text-muted-foreground">
                                +EGP {option.priceDelta}
                              </span>
                            ) : null}
                            {!option.isAvailable ? (
                              <span className="text-xs text-muted-foreground">
                                unavailable
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </motion.fieldset>
              );
            })}

            {/* Quantity + CTA */}
            <motion.div
              variants={fadeUp(Boolean(reduceMotion), 22)}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <div className="flex items-center gap-1 rounded-full border border-border p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-full"
                  onClick={() => setQuantity((n) => Math.max(1, n - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-4" />
                </Button>
                <output
                  aria-live="polite"
                  className="num w-10 text-center text-base font-semibold"
                >
                  {quantity}
                </output>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-full"
                  onClick={() =>
                    setQuantity((n) => Math.min(CHECKOUT_MAX_QUANTITY, n + 1))
                  }
                  disabled={quantity >= CHECKOUT_MAX_QUANTITY}
                  aria-label="Increase quantity"
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <Button
                variant="brand"
                size="pillLg"
                className="flex-1 sm:flex-none"
                onClick={handleAddToCart}
                disabled={isPending || unmetGroups.length > 0 || !variant.isAvailable}
              >
                <ShoppingBag aria-hidden="true" />
                Add to cart
                <span className="num">· EGP {lineTotal}</span>
              </Button>
            </motion.div>

            {/* Says what to do, not just that something is wrong. */}
            {unmetGroups.length > 0 ? (
              <motion.p
                variants={fadeUp(Boolean(reduceMotion), 12)}
                className="mt-4 text-sm text-muted-foreground"
              >
                Choose an option for {unmetGroups.map((group) => group.name).join(" and ")}{" "}
                to continue.
              </motion.p>
            ) : null}

            {/* Dev seam: the exact cart-line identity this selection produces. */}
            {modifierSignature ? (
              <p className="sr-only">Selection signature {modifierSignature}</p>
            ) : null}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default ProductInfo;
