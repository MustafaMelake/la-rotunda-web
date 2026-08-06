// Shared client + server Zod schemas. The client form and the Server Action
// parse the SAME schema — re-parsed server-side because the client is never
// trusted. This is a plain module (not "use server"), so it may export values.

export const CHECKOUT_MAX_QUANTITY = 99; // per line
export const CHECKOUT_MAX_ITEMS = 50; // distinct lines

// TODO(la-rotunda): export checkoutSchema, productSchema, menuItemSchema, …
// A DELIVERY order must carry a non-empty addressLine — enforce it here with
// a superRefine so both sides of the boundary agree.
