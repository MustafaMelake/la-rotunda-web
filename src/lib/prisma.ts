import dns from "node:dns";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prefer IPv4 when resolving the database host. Neon advertises both AAAA and A
// records; on networks with broken IPv6 routing the connection hangs until
// ETIMEDOUT. IPv4-first removes that failure mode, IPv6 still works as fallback.
dns.setDefaultResultOrder("ipv4first");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to your .env file.");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Memoized on globalThis outside production so dev hot-reload doesn't exhaust
// the connection pool. Never `new PrismaClient()` anywhere else.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
