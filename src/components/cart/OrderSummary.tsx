"use client";

import Image from "next/image";

import type { CartLine, FulfillmentMethod } from "@/components/cart/cart-data";
import { lineKey, lineTotal, summarise } from "@/components/cart/cart-data";
import type { BranchMock } from "@/lib/mock/branches";

/**
 * One summary component for both the cart and the checkout.
 *
 * Shared on purpose: these are the same numbers shown twice, and two components
 * computing them independently is how a customer ends up seeing one total on the
 * cart page and a different one at the till. Both call `summarise`, so the order
 * of operations can only be wrong in one place.
 */
export function OrderSummary({
  lines,
  fulfillment,
  branch,
  showLineItems = false,
  children,
}: {
  lines: readonly CartLine[];
  fulfillment: FulfillmentMethod;
  branch: BranchMock | null;
  /** Checkout shows a read-only manifest; the cart already lists the items. */
  showLineItems?: boolean;
  /** The call-to-action slot. */
  children?: React.ReactNode;
}) {
  const { subtotal, vat, deliveryFee, total } = summarise(lines, fulfillment, branch);

  return (
    <aside className="rounded-3xl bg-card p-6 ring-1 ring-border sm:p-7">
      <h2 className="font-display text-xl">Order summary</h2>

      {showLineItems ? (
        <ul className="mt-5 flex flex-col gap-4 border-b border-border pb-5">
          {lines.map((line) => (
            <li key={lineKey(line)} className="flex items-center gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                <Image
                  src={line.image}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
                <span className="num absolute right-0 top-0 grid size-5 place-items-center rounded-bl-lg bg-primary text-[0.65rem] font-bold text-white">
                  {line.quantity}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{line.productName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {line.variantName}
                  {line.modifiers.length > 0
                    ? ` · ${line.modifiers.map((modifier) => modifier.name).join(", ")}`
                    : ""}
                </p>
              </div>

              <p className="num shrink-0 text-sm font-semibold">
                EGP {lineTotal(line)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {/* `.num` on every figure: these change as quantities and fulfilment
          change, and a total must never reflow as digits are added. */}
      <dl className="mt-5 flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="num font-semibold">EGP {subtotal}</dd>
        </div>

        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">
            Delivery
            {fulfillment === "PICKUP" ? (
              <span className="ml-1.5 text-xs">(collecting)</span>
            ) : branch ? (
              <span className="ml-1.5 text-xs">from {branch.name}</span>
            ) : (
              <span className="ml-1.5 text-xs">standard rate</span>
            )}
          </dt>
          <dd className="num font-semibold">
            {deliveryFee === 0 ? "Free" : `EGP ${deliveryFee}`}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">VAT</dt>
          <dd className="num font-semibold">EGP {vat}</dd>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-4">
          <dt className="font-display text-lg">Total</dt>
          <dd className="num text-2xl font-bold text-primary">EGP {total}</dd>
        </div>
      </dl>

      {children ? <div className="mt-6">{children}</div> : null}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Prices include VAT. The final amount is confirmed by the kitchen when
        your order is accepted.
      </p>
    </aside>
  );
}

export default OrderSummary;
