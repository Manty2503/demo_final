// app/actions/saveInterview.ts
"use server";

import { db } from "@/db";
import { interviewAnswers } from "@/db/schema";

export async function saveInterview(
  userId: string,
  answers: Array<{
    question: string;
    transcript: string;
    audioUrl?: string | null;
  }>
) {
  console.log(answers)
  if (!answers || answers.length === 0) {
    console.warn("No answers provided to saveInterview()");
    return { success: false, message: "No answers to save." };
  }

  try {
    await db.insert(interviewAnswers).values(
      answers.map((a) => ({
        userId,
        question: a.question,
        transcript: a.transcript,
        audioUrl: a.audioUrl || null,
      }))
    );
    return { success: true };
  } catch (error) {
    console.error("DB Error:", error);
    return { error: "Failed to save" };
  }
}
