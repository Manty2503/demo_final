import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",  // Path to schema definition
  out: "./db/migrations",    // Output directory for migrations
  dialect: "postgresql",     // PostgreSQL dialect
  dbCredentials: {
    url: process.env.DATABASE_URL as string, // Assert DATABASE_URL as a string
  },
});