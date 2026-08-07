// The client-side session door — `useSession()` comes from here, never from
// better-auth directly, so the typed `role` field stays consistent.
//
// TODO(la-rotunda):
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const { useSession, signIn, signUp, signOut } = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
//
// While useSession() is `isPending`, render a pulse skeleton — NOT "Sign In".
// A logged-in user must never see a Sign-In flash.

export {};
