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



export const interviewAnswers = pgTable("interview_answers", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // You can set this dynamically
  question: text("question").notNull(),
  transcript: text("transcript").notNull(),
  audioUrl: text("audio_url"), // optional if uploaded to S3 or local storage
  createdAt: timestamp("created_at").defaultNow(),
});

