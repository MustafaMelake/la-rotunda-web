// Better Auth server instance — the single place the auth config is defined.
//
// TODO(la-rotunda): wire this once prisma/schema.prisma has the auth models.
//
//   import { betterAuth } from "better-auth";
//   import { prismaAdapter } from "better-auth/adapters/prisma";
//   import { nextCookies } from "better-auth/next-js";
//   import { prisma } from "@/lib/prisma";
//
//   export const auth = betterAuth({
//     database: prismaAdapter(prisma, { provider: "postgresql" }),
//     emailAndPassword: { enabled: true },
//     user: {
//       additionalFields: {
//         // input: false — a client can NEVER self-assign a role at signup.
//         role:     { type: "string", defaultValue: "USER", input: false },
//         branchId: { type: "string", required: false,      input: false },
//       },
//     },
//     // nextCookies() MUST stay the last plugin.
//     plugins: [nextCookies()],
//   });

export {};
