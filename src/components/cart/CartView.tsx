"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { OrderSummary } from "@/components/cart/OrderSummary";
import type { CartLine } from "@/components/cart/cart-data";
import {
  MOCK_CART,
  cartItemCount,
  lineKey,
  lineTotal,
  lineUnitPrice,
} from "@/components/cart/cart-data";
import { Button } from "@/components/ui/button";
import { fadeUp, staggerParent } from "@/lib/motion";
import { CHECKOUT_MAX_QUANTITY } from "@/lib/validators";

/**
 * A label that distinguishes one line from another.
 *
 * The product name alone is NOT enough: two lines can share a product and a
 * variant and differ only by their modifiers — that is the whole reason the line
 * identity is a pair. Labelling both buttons "Remove Mega Box" leaves a screen
 * reader user with two identical controls that do different things.
 */
function lineLabel(line: CartLine): string {
  const extras = line.modifiers.map((modifier) => modifier.name).join(", ");
  const base = `${line.productName}, ${line.variantName}`;
  return extras ? `${base}, with ${extras}` : base;
}

/**
 * Local state stands in for the Zustand `persist` store at
 * `src/lib/cart-store.ts`, which does not exist yet. That store carries more
 * than this — a record-then-confirm `pendingOps` ledger, and a hydrate path
 * distinct from the one true guest→user merge — so it is its own piece of work.
 * What matters here is that the line identity is already correct, so swapping
 * the state source in later changes no logic below.
 */
export function CartView() {
  const reduceMotion = useReducedMotion();
  const [lines, setLines] = React.useState<CartLine[]>(() => [...MOCK_CART]);

  function updateQuantity(key: string, next: number) {
    setLines((previous) =>
      previous.map((line) =>
        lineKey(line) === key
          ? { ...line, quantity: Math.min(CHECKOUT_MAX_QUANTITY, Math.max(1, next)) }
          : line,
      ),
    );
  }

  function removeLine(key: string) {
    setLines((previous) => previous.filter((line) => lineKey(line) !== key));
  }

  const count = cartItemCount(lines);

  if (lines.length === 0) {
    return (
      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-2xl px-5 text-center sm:px-8">
          <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-none">
            Your cart
          </h1>
          {/* An empty state is an invitation to act, not an apology. */}
          <p className="mt-4 text-muted-foreground">
            Nothing in here yet. The buckets are the usual starting point.
          </p>
          <Button asChild variant="brand" size="pillLg" className="mt-8">
            <Link href="/menu">Browse the menu</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="font-display text-[clamp(2rem,5vw,3.25rem)] leading-none">
            Your cart
          </h1>
          <p className="num text-muted-foreground">
            {count} item{count === 1 ? "" : "s"}
          </p>
        </header>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_22rem] lg:gap-12">
          <motion.ul
            variants={staggerParent(0.1)}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-4"
          >
            {lines.map((line) => {
              const key = lineKey(line);

              return (
                <motion.li
                  key={key}
                  variants={fadeUp(Boolean(reduceMotion), 24)}
                  layout={!reduceMotion}
                  className="flex flex-col gap-4 rounded-3xl bg-card p-4 ring-1 ring-border sm:flex-row sm:items-center sm:p-5"
                >
                  <Link
                    href={`/product/${line.productSlug}`}
                    className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-muted sm:size-28"
                  >
                    <Image
                      src={line.image}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 112px, 90vw"
                      className="object-cover"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${line.productSlug}`}
                      className="font-display text-lg leading-tight underline-offset-4 hover:text-primary hover:underline"
                    >
                      {line.productName}
                    </Link>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {line.variantName}
                    </p>

                    {line.modifiers.length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {line.modifiers.map((modifier) => (
                          <li
                            key={modifier.optionId}
                            className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground"
                          >
                            {modifier.name}
                            {modifier.priceDelta !== 0 ? (
                              <span className="num"> +EGP {modifier.priceDelta}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <p className="num mt-2 text-sm text-muted-foreground">
                      EGP {lineUnitPrice(line)} each
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-3">
                    <div className="flex items-center gap-1 rounded-full border border-border p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full"
                        onClick={() => updateQuantity(key, line.quantity - 1)}
                        disabled={line.quantity <= 1}
                        aria-label={`Decrease quantity of ${lineLabel(line)}`}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <output
                        aria-live="polite"
                        className="num w-8 text-center text-sm font-semibold"
                      >
                        {line.quantity}
                      </output>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full"
                        onClick={() => updateQuantity(key, line.quantity + 1)}
                        disabled={line.quantity >= CHECKOUT_MAX_QUANTITY}
                        aria-label={`Increase quantity of ${lineLabel(line)}`}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="num text-lg font-bold">EGP {lineTotal(line)}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-full text-muted-foreground hover:text-destructive"
                        onClick={() => removeLine(key)}
                        aria-label={`Remove ${lineLabel(line)} from your cart`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </motion.ul>

          {/* Sticky on desktop so the total stays in view down a long cart. */}
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)]">
            <OrderSummary lines={lines} fulfillment="DELIVERY" branch={null}>
              <Button asChild variant="brand" size="pillLg" className="w-full">
                <Link href="/checkout">
                  <ShoppingBag aria-hidden="true" />
                  Proceed to checkout
                </Link>
              </Button>
            </OrderSummary>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CartView;
