// app/api/transcribe/route.ts
"use server"
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // 🛡️ Secure backend key
    },
    body: formData,
  });

  const data = await response.json();
  return NextResponse.json(data);
}
