// app/api/webrtc/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { sdp, model, ephemeralKey } = await request.json();
  
  try {
    const response = await fetch(
      `https://api.openai.com/v1/realtime?model=${model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1'
        },
        body: sdp,
      }
    );
    
    if (!response.ok) {
      throw new Error(`WebRTC signaling failed: ${response.statusText}`);
    }
    
    const answerSdp = await response.text();
    return NextResponse.json({ sdp: answerSdp });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'WebRTC signaling failed' },
      { status: 500 }
    );
  }
}