"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Banknote, Bike, CreditCard, ShoppingBag, Store } from "lucide-react";
import { toast } from "sonner";

import { OrderSummary } from "@/components/cart/OrderSummary";
import type { FulfillmentMethod } from "@/components/cart/cart-data";
import { MOCK_CART } from "@/components/cart/cart-data";
import { Button } from "@/components/ui/button";
import { BRANCHES, OTHER_AREAS_ID, getBranchById } from "@/lib/mock/branches";
import { fadeUp, staggerParent } from "@/lib/motion";
import { cn } from "@/lib/utils";

const FIELD =
  "mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function CheckoutView() {
  const reduceMotion = useReducedMotion();

  const [fulfillment, setFulfillment] = React.useState<FulfillmentMethod>("DELIVERY");
  const [branchId, setBranchId] = React.useState<string>(BRANCHES[0].id);
  const [payment, setPayment] = React.useState<"COD">("COD");
  const [firstName, setFirstName] = React.useState("Mustafa");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [addressLine, setAddressLine] = React.useState("");
  const [city, setCity] = React.useState("Menofia, Egypt");
  const [notes, setNotes] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  /**
   * "Other Areas" is a client-side sentinel only. It stands for an address with
   * no branch near it and maps to `branchId: null` — an unassigned order, which
   * is Super-Admin-only. It must NEVER be sent as a branch id; it is translated
   * at this boundary and nowhere else.
   */
  const branch = branchId === OTHER_AREAS_ID ? null : getBranchById(branchId);

  // A DELIVERY order must carry a non-empty address — enforced here so the form
  // can say so, and again by checkoutSchema inside placeOrder, because the
  // client is never trusted.
  const missingAddress = fulfillment === "DELIVERY" && addressLine.trim() === "";
  const missingPhone = phone.trim() === "";
  const canPlace = !missingAddress && !missingPhone && !isPending;

  function handlePlaceOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!canPlace) return;

    startTransition(() => {
      // TODO(la-rotunda): await placeOrder({ … }). The payload carries ids and
      // intent only — { variantId, quantity, modifierOptionIds }[] plus contact,
      // fulfilment and a resolved branchId. No price and no delta ever crosses
      // the wire; the server re-reads both and bills authoritatively.
      toast.info("Checkout isn't connected yet", {
        description: `Would place a ${fulfillment.toLowerCase()} order for ${
          MOCK_CART.length
        } lines${branch ? ` from ${branch.name}` : " with no assigned branch"}.`,
      });
    });
  }

  return (
    <section className="bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <header>
          <h1 className="font-display text-[clamp(2rem,5vw,3.25rem)] leading-none">
            Checkout
          </h1>
          <p className="mt-3 text-muted-foreground">
            No account needed — we only ask for what the driver needs to find you.
          </p>
        </header>

        <form
          onSubmit={handlePlaceOrder}
          className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_22rem] lg:gap-12"
        >
          <motion.div
            variants={staggerParent(0.09)}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-8"
          >
            {/* How they get it — this drives the fee, so it comes first. */}
            <motion.fieldset variants={fadeUp(Boolean(reduceMotion), 22)}>
              <legend className="font-display text-lg">How would you like it?</legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    { value: "DELIVERY", label: "Deliver to me", icon: Bike, hint: "Fee set by branch" },
                    { value: "PICKUP", label: "I'll collect", icon: Store, hint: "No delivery fee" },
                  ] as const
                ).map((option) => {
                  const Icon = option.icon;
                  const active = fulfillment === option.value;
                  return (
                    <label key={option.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="fulfillment"
                        value={option.value}
                        checked={active}
                        onChange={() => setFulfillment(option.value)}
                        className="peer sr-only"
                      />
                      <span className="flex items-start gap-3 rounded-2xl border border-border p-4 transition-colors peer-checked:border-primary peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50">
                        <Icon aria-hidden="true" className="mt-0.5 size-5 text-primary" />
                        <span>
                          <span className="block text-sm font-semibold">{option.label}</span>
                          <span className="block text-xs text-muted-foreground">
                            {option.hint}
                          </span>
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </motion.fieldset>

            <motion.div variants={fadeUp(Boolean(reduceMotion), 22)}>
              <Field
                id="branch"
                label={fulfillment === "PICKUP" ? "Collect from" : "Nearest branch"}
                hint={
                  branch
                    ? `Delivery from ${branch.name} costs EGP ${branch.deliveryFee}.`
                    : "We'll assign the closest kitchen and confirm the fee by phone."
                }
              >
                <select
                  id="branch"
                  value={branchId}
                  onChange={(event) => setBranchId(event.target.value)}
                  className={FIELD}
                >
                  {BRANCHES.filter((candidate) => candidate.isAcceptingOrders).map(
                    (candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </option>
                    ),
                  )}
                  <option value={OTHER_AREAS_ID}>Other areas</option>
                </select>
              </Field>
            </motion.div>

            <motion.fieldset variants={fadeUp(Boolean(reduceMotion), 22)}>
              <legend className="font-display text-lg">Your details</legend>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field id="firstName" label="First name">
                  <input
                    id="firstName"
                    name="firstName"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className={FIELD}
                  />
                </Field>

                <Field id="lastName" label="Last name">
                  <input
                    id="lastName"
                    name="lastName"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className={FIELD}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field
                    id="phone"
                    label="Phone number"
                    hint={
                      missingPhone
                        ? "We need a number to confirm the order and reach you at the door."
                        : undefined
                    }
                  >
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      placeholder="+20 100 000 0000"
                      aria-invalid={missingPhone}
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className={cn(FIELD, "num")}
                    />
                  </Field>
                </div>

                {fulfillment === "DELIVERY" ? (
                  <div className="sm:col-span-2">
                    <Field
                      id="addressLine"
                      label="Street address"
                      hint={
                        missingAddress
                          ? "Add a street and building — a delivery order can't be placed without one."
                          : "Building, floor and a landmark all help."
                      }
                    >
                      <input
                        id="addressLine"
                        name="addressLine"
                        autoComplete="street-address"
                        required
                        aria-invalid={missingAddress}
                        value={addressLine}
                        onChange={(event) => setAddressLine(event.target.value)}
                        className={FIELD}
                      />
                    </Field>
                  </div>
                ) : null}

                <div className="sm:col-span-2">
                  <Field id="city" label="City">
                    <input
                      id="city"
                      name="city"
                      autoComplete="address-level2"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      className={FIELD}
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field id="notes" label="Order notes" hint="Optional.">
                    <textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      placeholder="Extra napkins, gate code, no onions…"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className={cn(FIELD, "resize-y")}
                    />
                  </Field>
                </div>
              </div>
            </motion.fieldset>

            <motion.fieldset variants={fadeUp(Boolean(reduceMotion), 22)}>
              <legend className="font-display text-lg">Payment</legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="COD"
                    checked={payment === "COD"}
                    onChange={() => setPayment("COD")}
                    className="peer sr-only"
                  />
                  <span className="flex items-start gap-3 rounded-2xl border border-border p-4 transition-colors peer-checked:border-primary peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50">
                    <Banknote aria-hidden="true" className="mt-0.5 size-5 text-primary" />
                    <span>
                      <span className="block text-sm font-semibold">Cash on delivery</span>
                      <span className="block text-xs text-muted-foreground">
                        Pay the driver when it arrives.
                      </span>
                    </span>
                  </span>
                </label>

                {/*
                  Card is shown but disabled. There is no payment provider wired
                  into this project, so a working-looking card form would collect
                  real card numbers with nowhere safe to send them. It stays off
                  until a processor is integrated.
                */}
                <div
                  aria-disabled="true"
                  className="flex items-start gap-3 rounded-2xl border border-dashed border-border p-4 opacity-60"
                >
                  <CreditCard aria-hidden="true" className="mt-0.5 size-5 text-muted-foreground" />
                  <span>
                    <span className="block text-sm font-semibold">Card</span>
                    <span className="block text-xs text-muted-foreground">
                      Not available yet — no payment provider is connected.
                    </span>
                  </span>
                </div>
              </div>
            </motion.fieldset>
          </motion.div>

          <div className="lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)]">
            <OrderSummary
              lines={MOCK_CART}
              fulfillment={fulfillment}
              branch={branch}
              showLineItems
            >
              <motion.div whileTap={reduceMotion ? undefined : { scale: 0.97 }}>
                <Button
                  type="submit"
                  variant="brand"
                  size="pillLg"
                  className="w-full"
                  disabled={!canPlace}
                >
                  <ShoppingBag aria-hidden="true" />
                  Place order
                </Button>
              </motion.div>

              {!canPlace && !isPending ? (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {missingPhone
                    ? "Add a phone number to place the order."
                    : "Add a street address to place the order."}
                </p>
              ) : null}

              <p className="mt-3 text-center text-xs text-muted-foreground">
                <Link href="/cart" className="underline-offset-4 hover:underline">
                  Back to cart
                </Link>
              </p>
            </OrderSummary>
          </div>
        </form>
      </div>
    </section>
  );
}

export default CheckoutView;
