import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing tenant id." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const enable = typeof body?.enabled === "boolean" ? body.enabled : false;

    try {
      const tenant = await prisma.tenant.update({
        where: { id },
        data: { userSeatsEnabled: enable, userSeatsRequested: false },
        select: { id: true, name: true, userSeatsEnabled: true, userSeatsRequested: true },
      });
      return NextResponse.json({ tenant });
    } catch (err) {
      console.error("[user-seats] prisma update failed, attempting raw fallback", err);
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "Tenant" SET "userSeatsEnabled" = $1, "userSeatsRequested" = false WHERE id = $2`,
          enable,
          id,
        );
        const result = await prisma.$queryRawUnsafe<
          { id: string; name: string | null; userSeatsEnabled: boolean | null; userSeatsRequested: boolean | null }[]
        >(
          `SELECT id, name, "userSeatsEnabled", "userSeatsRequested" FROM "Tenant" WHERE id = $1 LIMIT 1`,
          id,
        );
        return NextResponse.json({
          tenant: result[0] ?? { id, name: null, userSeatsEnabled: enable, userSeatsRequested: false },
        });
      } catch (rawErr) {
        console.error("[user-seats] raw fallback failed", rawErr);
        return NextResponse.json(
          {
            error:
              "User seats not available on this database. Run `npm run db:push` to sync schema and retry.",
          },
          { status: 500 },
        );
      }
    }
  } catch (error) {
    console.error("[PATCH /api/admin/tenants/:id/user-seats]", error);
    return NextResponse.json({ error: "Could not update user seat setting." }, { status: 500 });
  }
}
