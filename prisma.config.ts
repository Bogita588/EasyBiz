import "dotenv/config";
import { defineConfig } from "prisma/config";

const url =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/easybiz";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url,
  },
});
