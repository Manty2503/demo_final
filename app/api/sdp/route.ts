// app/api/sdp/route.ts
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const offerSDP = await req.text();

  const res = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17&voice=alloy", {
    method: "POST",
    body: offerSDP,
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/sdp",
      "OpenAI-Beta": "realtime=v1"
    }
  });

  const answer = await res.text();
  return new Response(answer, { status: res.status });
}
