import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function logAudit(params: {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  meta?: Record<string, unknown>;
}) {
  try {
    // If model is unavailable (e.g., during build/dev), skip.
    if (!prisma || !(prisma as { auditLog?: unknown }).auditLog) return;
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId || null,
        userId: params.userId || null,
        action: params.action,
        meta: (params.meta as Prisma.JsonObject) ?? {},
      },
    });
  } catch {
    // Swallow audit errors to avoid breaking primary flows.
  }
}
