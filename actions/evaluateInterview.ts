"use server";

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const evaluationSchema = z.object({
  summary: z.string(),
  scores: z.object({
    communication: z.number().min(0).max(10),
    problemSolving: z.number().min(0).max(10),
    technicalDepth: z.number().min(0).max(10),
    cultureFit: z.number().min(0).max(10),
    clarityBrevity: z.number().min(0).max(10),
  }),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

export async function evaluateAnswers(
  transcripts: string[],
  questions: string[]
): Promise<Evaluation> {
  const prompt = questions
    .map((q, i) => `Q: ${q}\nA: ${transcripts[i] || "No answer"}`)
    .join("\n\n");

  const { object } = await generateObject({
    model: openai.chat("gpt-4"),
    prompt: `Evaluate the following interview and assign scores (0–10) for each category:\n\n${prompt}`,
    schema: evaluationSchema,
  });

  return object;
}
