import { pgTable, serial, text, json, timestamp, varchar } from 'drizzle-orm/pg-core';

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  priority: varchar("priority", { length: 50 }),
  status: varchar("status", { length: 50 }).default("pending"),
  userId: varchar("user_id", { length: 255 }).notNull(), // ✅ Changed from serial to varchar
});



export const interviews = pgTable('interviews', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  questions: json('questions').notNull(),
  answers: json('answers').$type<Array<{
    text: string;
    timestamp: string;
  }>>().notNull(),
  summary: text('summary').notNull(),
  scores: json('scores').$type<{
    communication: number;
    problemSolving: number;
    technicalDepth: number;
    cultureFit: number;
    clarityBrevity: number;
  }>().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
