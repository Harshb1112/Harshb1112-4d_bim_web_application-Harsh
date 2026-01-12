import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env and .env.local
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasources: {
    db: {
      url: process.env.DATABASE_URL!,
    },
  },
});
