import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function checkIdempotency(params: { tenantId: string; scope: string; key: string | null }) {
  if (!params.key || !params.tenantId) return null;
  // Safety in case Prisma client is out of date in dev.
  if (!prisma || !(prisma as { idempotencyKey?: unknown }).idempotencyKey) return null;
  const record = await prisma.idempotencyKey.findUnique({
    where: {
      tenantId_scope_key: {
        tenantId: params.tenantId,
        scope: params.scope,
        key: params.key,
      },
    },
    select: { status: true, response: true },
  });
  if (!record) return null;
  return { status: record.status, response: record.response };
}

export async function storeIdempotency(params: {
  tenantId: string;
  scope: string;
  key: string | null;
  status: number;
  response: unknown;
}) {
  if (!params.key || !params.tenantId) return;
  if (!prisma || !(prisma as { idempotencyKey?: unknown }).idempotencyKey) return;
  try {
    await prisma.idempotencyKey.upsert({
      where: {
        tenantId_scope_key: {
          tenantId: params.tenantId,
          scope: params.scope,
          key: params.key,
        },
      },
      update: { status: params.status, response: params.response as Prisma.InputJsonValue },
      create: {
        tenantId: params.tenantId,
        scope: params.scope,
        key: params.key,
        status: params.status,
        response: params.response as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("[idempotency] store failed", error);
  }
}
