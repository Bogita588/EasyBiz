import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  meta?: Record<string, unknown>;
}) {
  try {
    // If model is unavailable (e.g., during build/dev), skip.
    // @ts-expect-error auditLog may be undefined in older schemas
    if (!prisma || !prisma.auditLog) return;
    // @ts-expect-error auditLog may be undefined in older schemas
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId || null,
        userId: params.userId || null,
        action: params.action,
        meta: params.meta ?? {},
      },
    });
  } catch {
    // Swallow audit errors to avoid breaking primary flows.
  }
}
