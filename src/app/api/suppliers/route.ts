import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error("[GET /api/suppliers]", error);
    return NextResponse.json(
      { error: "Could not load suppliers." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await request.json();
    const name = body?.name as string | undefined;
    const phone = body?.phone as string | undefined;
    const email = body?.email as string | undefined;
    const whatsapp = body?.whatsapp as string | undefined;
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    const supplier = await prisma.supplier.create({
      data: {
        tenantId,
        name,
        phone,
        email,
        whatsapp,
      },
      select: { id: true, name: true },
    });
    return NextResponse.json({ supplier });
  } catch (error) {
    console.error("[POST /api/suppliers]", error);
    return NextResponse.json(
      { error: "Could not create supplier." },
      { status: 500 },
    );
  }
}
