"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Flame, Sprout, Users, type LucideIcon } from "lucide-react";

import { SectionHeading } from "@/components/home/SectionHeading";
import { fadeUp, staggerParent } from "@/lib/motion";

type Value = {
  icon: LucideIcon;
  title: string;
  body: string;
};

const VALUES: readonly Value[] = [
  {
    icon: Sprout,
    title: "Fresh, never frozen",
    body: "Chicken is marinated overnight and breaded by hand each morning, in every kitchen. Nothing turns up pre-coated, and nothing sits waiting.",
  },
  {
    icon: Flame,
    title: "Bold all the way through",
    body: "The heat lives in the flour, not in a sauce brushed on at the end. That is why the last piece in the box still tastes of something.",
  },
  {
    icon: Users,
    title: "Rooted in Menouf",
    body: "We opened on one street and still hire from it. Every branch is run by people who eat here on their day off.",
  },
] as const;

export function OurValues() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-muted/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading label="What we stand for" title="Three things we don't cut">
          Not a mission statement. These are the three decisions that cost us
          money and that we make anyway.
        </SectionHeading>

        <motion.ul
          variants={staggerParent(0.15, 0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {VALUES.map((value) => {
            const Icon = value.icon;
            return (
              <motion.li
                key={value.title}
                variants={fadeUp(Boolean(reduceMotion), 30)}
                whileHover={reduceMotion ? undefined : { y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="group relative flex flex-col overflow-hidden rounded-3xl bg-card p-7 ring-1 ring-border sm:p-8"
              >
                {/* The red accent: a hairline that draws across the card's top
                    edge on hover. Transform-only, so it costs nothing to animate. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-primary transition-transform duration-500 group-hover:scale-x-100"
                />

                <span
                  aria-hidden="true"
                  className="grid size-12 place-items-center rounded-2xl bg-accent text-primary"
                >
                  <Icon className="size-6" />
                </span>

                <h3 className="font-display mt-6 text-xl leading-tight">
                  {value.title}
                </h3>

                <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                  {value.body}
                </p>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}

export default OurValues;
