// app/actions/saveInterview.ts
"use server"

import { interviews } from '@/db/schema';
import { db } from '@/db';

export async function saveInterview(data: {
  userId: string;
  questions: string[];
  answers: { text: string; timestamp: string }[];
  summary: string;
  scores: {
    communication: number;
    problemSolving: number;
    technicalDepth: number;
    cultureFit: number;
    clarityBrevity: number;
  };
}) {
  await db.insert(interviews).values(data);
}
