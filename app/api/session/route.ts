// app/api/session/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "realtime=v1"
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "alloy",
      modalities: ["audio", "text"],
      instructions: "You are a helpful assistant.",
    })
  });

  const data = await res.json();
  return NextResponse.json({ client_secret: data.client_secret });
}
