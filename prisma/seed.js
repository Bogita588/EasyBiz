/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv/config");
const { PrismaClient, Prisma } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const datasourceUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/easybiz";
const pool = new Pool({ connectionString: datasourceUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.tenant.findFirst({
    where: { name: "Rahisi Demo" },
  });

  if (existing) {
    console.log("Seed skipped: demo tenant already exists.");
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: "Rahisi Demo",
      businessType: "duka",
      mpesaTill: "123456",
      mpesaPaybill: "987654",
      users: {
        create: {
          name: "Owner",
          phone: "+254700000001",
          role: "OWNER",
        },
      },
      customers: {
        create: [
          { name: "Mary Njeri", phone: "+254700000111" },
          { name: "John Kamau", phone: "+254700000222", priceTier: "WHOLESALE" },
        ],
      },
      items: {
        create: [
          {
            name: "Sugar (1kg)",
            price: new Prisma.Decimal("220.00"),
            wholesalePrice: new Prisma.Decimal("200.00"),
            stockQuantity: 40,
            lowStockThreshold: 10,
          },
          {
            name: "Cooking oil (500ml)",
            price: new Prisma.Decimal("320.00"),
            wholesalePrice: new Prisma.Decimal("300.00"),
            stockQuantity: 25,
            lowStockThreshold: 8,
          },
        ],
      },
    },
    include: { customers: true, items: true },
  });

  const customer = tenant.customers[0];
  const item = tenant.items[0];

  const invoice = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      status: "SENT",
      subtotal: item.price,
      taxTotal: new Prisma.Decimal("0.00"),
      discount: new Prisma.Decimal("0.00"),
      total: item.price,
      lines: {
        create: [
          {
            description: item.name,
            itemId: item.id,
            quantity: 1,
            unitPrice: item.price,
            lineTotal: item.price,
          },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      invoiceId: invoice.id,
      method: "MPESA_TILL",
      status: "PENDING",
      amount: invoice.total,
      mpesaReceipt: null,
      requestedAt: new Date(),
    },
  });

  await prisma.activityEvent.createMany({
    data: [
      {
        tenantId: tenant.id,
        type: "INVOICE",
        message: `Invoice sent to ${customer.name}. Waiting for payment.`,
        refType: "invoice",
        refId: invoice.id,
      },
      {
        tenantId: tenant.id,
        type: "STOCK",
        message: "Sugar is running low. Reorder?",
        refType: "item",
        refId: item.id,
      },
    ],
  });

  console.log("Seed complete: demo tenant created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
