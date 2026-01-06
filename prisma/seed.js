/* eslint-disable */
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const crypto = require("crypto");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/easybiz";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@easybiz.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const adminHash = await hash(adminPassword);

  // Upsert platform tenant
  let tenant = await prisma.tenant.findFirst({
    where: { name: "Platform" },
    select: { id: true },
  });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Platform",
        status: "ACTIVE",
        businessType: "Platform",
        userSeatsEnabled: true,
        userSeatsRequested: false,
      },
      select: { id: true },
    });
  }

  // Upsert admin user
  const existingUser = await prisma.user.findFirst({
    where: { email: adminEmail },
    select: { id: true },
  });
  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: adminHash,
        role: "ADMIN",
        tenantId: tenant.id,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: adminEmail,
        name: "Super Admin",
        role: "ADMIN",
        password: adminHash,
      },
    });
  }

  console.log("Super admin seeded:", adminEmail, "password:", adminPassword);
}

async function hash(pw) {
  const bcrypt = require("bcryptjs");
  return bcrypt.hash(pw, 10);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
