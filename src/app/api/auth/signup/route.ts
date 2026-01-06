import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = (formData.get("name") as string | null)?.trim();
    const email = (formData.get("email") as string | null)?.trim().toLowerCase();
    const business = (formData.get("business") as string | null)?.trim();
    const phone = (formData.get("phone") as string | null)?.trim();
    const password = formData.get("password") as string | null;
    const confirm = formData.get("confirm") as string | null;

    const base = baseUrl(request);
    if (!name || !email || !business || !phone || !password || !confirm) {
      return NextResponse.redirect(new URL("/signup?error=missing", base));
    }
    if (password !== confirm) {
      return NextResponse.redirect(new URL("/signup?error=password_mismatch", base));
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: business,
        businessType: "Pending",
        status: "PENDING",
      },
      select: { id: true },
    });

    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name,
        email,
        phone,
        role: "OWNER",
        password: hashPassword(password),
      },
    });

    return NextResponse.redirect(new URL("/access/pending", baseUrl(request)));
  } catch (error) {
    console.error("[POST /api/auth/signup]", error);
    return NextResponse.redirect(new URL("/signup?error=unknown", baseUrl(request)));
  }
}

function hashPassword(pw: string) {
  return createHash("sha256").update(pw).digest("hex");
}

function baseUrl(req: Request) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
