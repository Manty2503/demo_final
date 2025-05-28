import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema"; // Import your schema

// Ensure DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.log(process.env.DATABASE_URL);
  
  throw new Error("DATABASE_URL is not set in environment variables.");
}

// Create a connection to Neon PostgreSQL
const sql = neon(process.env.DATABASE_URL);

// Initialize Drizzle ORM with the correct schema
export const db = drizzle(sql, { schema });
