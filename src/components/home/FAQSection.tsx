"use client";

import { motion, useReducedMotion } from "framer-motion";

import { SectionHeading } from "@/components/home/SectionHeading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * Answers are written against what the platform actually does, so the FAQ
 * stays true as the build lands:
 *
 *  - guest checkout is real — `placeOrder` accepts `userId: null`, and
 *    /checkout is deliberately left out of the proxy matcher for that reason.
 *  - discounts are resolved server-side by the Discount Engine; there is no
 *    coupon-code model in the schema at all.
 *  - pickup is a real fulfilment type and zero-rates the delivery fee.
 *
 * The one marked CLIENT-CONFIRM below is a business fact no code can settle.
 */
const FAQS = [
  {
    q: "Do you deliver to my area?",
    a: "Each branch covers the neighbourhoods around it, so the areas we reach depend on where you are. Pick your branch at checkout and you'll see the delivery fee before you pay. Prefer to collect? Choose pickup and the fee comes off entirely.",
  },
  {
    q: "What are your opening hours?",
    a: "Every day from 11:00 AM until 2:00 AM. Hours can differ slightly by branch, and each branch page shows its own — including whether the kitchen is taking orders right now.",
  },
  {
    q: "Do I need an account to order?",
    a: "No. You can check out as a guest with just a name, phone number and address. Creating an account only adds order history and saved details.",
  },
  {
    q: "Do I need a code to get a discount?",
    a: "No codes anywhere. Live offers are already applied to the prices you see, and the price on the menu is the price you're charged. If two offers could apply, you get the cheaper one.",
  },
  {
    // CLIENT-CONFIRM
    q: "Do you have spicy options?",
    a: "Yes. Most of the chicken and sandwiches come in original or hot, and you pick the heat level as an option when you add the item to your order.",
  },
] as const;

export function FAQSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-background pt-20 pb-20 sm:pt-28 sm:pb-28">
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-7xl px-5 sm:px-8"
      >
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <SectionHeading
            align="left"
            label="FAQ"
            title="Frequently asked questions"
            className="lg:max-w-sm"
          >
            The things people ask us most, answered plainly. If yours isn&apos;t
            here, any branch will pick up the phone.
          </SectionHeading>

          <Accordion
            type="single"
            collapsible
            defaultValue="faq-0"
            className="w-full"
          >
            {FAQS.map((faq, index) => (
              /*
               * Each row drives its own entrance rather than inheriting a
               * parent `staggerChildren`: variant propagation would have to
               * cross the non-motion <Accordion> boundary, and if it ever
               * failed the rows would sit at opacity 0 — an invisible FAQ.
               * An index delay buys the same cascade with no such failure mode.
               *
               * The separator also lives on THIS wrapper, not on AccordionItem:
               * once wrapped, every item is an only child, so `last:border-b-0`
               * on the item would match all of them and erase every divider.
               */
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{
                  duration: 0.45,
                  delay: reduceMotion ? 0 : index * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="border-b border-border last:border-b-0"
              >
                <AccordionItem value={`faq-${index}`} className="border-b-0">
                  <AccordionTrigger className="font-display text-base sm:text-lg">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="max-w-prose text-pretty leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </motion.div>
    </section>
  );
}

export default FAQSection;
