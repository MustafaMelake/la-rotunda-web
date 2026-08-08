/**
 * Shared branch mock, mirroring the real `Branch` model.
 *
 * This lives in one module because `deliveryFee` is MONEY and it is read by two
 * surfaces — the /branches cards and the checkout fee line. Two copies of a
 * money value diverge silently and the customer sees one figure on one page and
 * a different one at the till.
 *
 * Replace wholesale with `prisma.branch.findMany({ where: { isActive: true } })`
 * — `isActive` is the soft-retirement flag, so a retired branch must never reach
 * either surface. `deliveryFee` is a `Decimal` there and needs `.toNumber()`
 * server-side before it crosses into a Client Component.
 */
export type BranchMock = {
  id: string;
  slug: string;
  name: string;
  /** `String?` in the schema — genuinely absent for some rows. */
  address: string | null;
  phone: string | null;
  /** "HH:mm", 24-hour, Africa/Cairo. `closeTime` may precede `openTime`. */
  openTime: string;
  closeTime: string;
  /** Manual kill switch, independent of the clock. */
  isAcceptingOrders: boolean;
  /** EGP. `Decimal` in the schema. */
  deliveryFee: number;
};

/** PLACEHOLDER — real addresses, numbers and fees needed from the client. */
export const BRANCHES: readonly BranchMock[] = [
  {
    id: "br1",
    slug: "menouf",
    name: "Menouf",
    address: "Gamal Abdel Nasser St, Menouf, Menofia Governorate",
    phone: "+20 100 000 0001",
    openTime: "11:00",
    closeTime: "03:00",
    isAcceptingOrders: true,
    deliveryFee: 25,
  },
  {
    id: "br2",
    slug: "shebin-el-kom",
    name: "Shebin El-Kom",
    address: "Tahrir St, Shebin El-Kom, Menofia Governorate",
    phone: "+20 100 000 0002",
    openTime: "11:00",
    closeTime: "02:00",
    isAcceptingOrders: true,
    deliveryFee: 35,
  },
  {
    id: "br3",
    slug: "ashmoun",
    name: "Ashmoun",
    address: "El-Geish St, Ashmoun, Menofia Governorate",
    phone: "+20 100 000 0003",
    openTime: "12:00",
    closeTime: "02:30",
    isAcceptingOrders: false,
    deliveryFee: 35,
  },
  {
    id: "br4",
    slug: "sadat-city",
    name: "Sadat City",
    address: "Central Axis, Sadat City, Menofia Governorate",
    phone: "+20 100 000 0004",
    openTime: "11:00",
    closeTime: "01:00",
    isAcceptingOrders: true,
    deliveryFee: 45,
  },
] as const;

/**
 * Client-side sentinel for "Other Areas" — an address we do not have a branch
 * near. It maps to `branchId: null` (an unassigned, Super-Admin-only order) and
 * **must never reach the server as a branch id**. Translate it at the submit
 * boundary, never pass it through.
 */
export const OTHER_AREAS_ID = "__other__";

/** Store-wide fallbacks. In production these come from the StoreSettings row. */
export const STORE_DEFAULTS = {
  defaultDeliveryFee: 35,
  vatRate: 0.14,
  isVatEnabled: true,
} as const;

export function getBranchById(id: string): BranchMock | null {
  return BRANCHES.find((branch) => branch.id === id) ?? null;
}
