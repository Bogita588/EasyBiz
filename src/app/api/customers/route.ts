import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const customers = await prisma.customer.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        whatsapp: true,
        location: true,
        notes: true,
        priceTier: true,
      },
    });
    return NextResponse.json({ customers });
  } catch (error) {
    console.error("[GET /api/customers]", error);
    return NextResponse.json(
      { error: "Could not load customers." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : null;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;
    const whatsapp = typeof body?.whatsapp === "string" ? body.whatsapp.trim() : null;
    const location = typeof body?.location === "string" ? body.location.trim() : null;
    const notes = typeof body?.notes === "string" ? body.notes.trim() : null;
    const priceTier =
      body?.priceTier === "WHOLESALE" || body?.priceTier === "RETAIL"
        ? body.priceTier
        : "RETAIL";
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name,
        phone,
        email,
        whatsapp,
        location,
        notes,
        priceTier,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        whatsapp: true,
        location: true,
        notes: true,
        priceTier: true,
      },
    });
    return NextResponse.json({ customer });
  } catch (error) {
    console.error("[POST /api/customers]", error);
    return NextResponse.json(
      { error: "Could not create customer." },
      { status: 500 },
    );
  }
}
