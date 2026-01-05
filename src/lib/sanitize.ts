import { Prisma } from "@prisma/client";

export function toDecimalOrNull(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value).replace(/,/g, "").trim();
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  try {
    return new Prisma.Decimal(raw);
  } catch {
    return null;
  }
}
