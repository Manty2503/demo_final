"use client";

import { evaluateAnswers, Evaluation } from "@/actions/evaluateInterview";
import { saveInterview } from "@/actions/saveInterview";
import { useRef, useState } from "react";

export default function TestPage() {
  const [status, setStatus] = useState("Idle");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  const speakCountRef = useRef(0);

  const startTest = async () => {
    console.clear();
    console.log("[🟢 START] Initializing interview session...");
    setStatus("Requesting microphone...");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;

    console.log("[🎙️ MIC] Microphone access granted");

    setStatus("Creating OpenAI session...");
    const sessionRes = await fetch("/api/session", { method: "POST" });
    const { client_secret } = await sessionRes.json();
    console.log("[🔐 SESSION] client_secret:", client_secret);

    const pc = new RTCPeerConnection();
    stream.getTracks().forEach((track) => pc.addTrack(track));

    pc.ontrack = (event) => {
      console.log("[🔈 AUDIO TRACK] Assistant voice track received");
      audioEl.srcObject = event.streams[0];
    };

    const dc = pc.createDataChannel("chat");

    dc.onopen = () => {
      console.log("[✅ DataChannel OPEN]");

      const sessionUpdate = {
        type: "session.update",
        session: {
          modalities: ["audio", "text"],
          input_audio_transcription: {
            model: "whisper-1",
          },
        },
      };
      dc.send(JSON.stringify(sessionUpdate));
      console.log("[📤 SENT] session.update");

      const msg = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
You are an AI interviewer. Your only job is to ask exactly 4 technical questions on the topic: "Machine Learning".

Rules:
- Ask one question at a time.
- Wait silently for my answer.
- Do not explain, evaluate, confirm or respond to my answers.
- Ask the next question only after I answer the current one.
- Speak and display only the question itself.
Begin now.`,
            },
          ],
        },
      };
      dc.send(JSON.stringify(msg));
      dc.send(JSON.stringify({ type: "response.create" }));
      console.log("[📤 SENT] topic prompt");
    };

    dc.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (
          msg.type === "response.audio_transcript.done" &&
          speakCountRef.current < 4
        ) {
          const question = msg.transcript;
          setCurrentQuestion(question);
          setQuestions((prev) => [...prev, question]);
          console.log("[🎤 GPT QUESTION]:", question);
        }

        if (
          msg.type === "conversation.item.input_audio_transcription.completed"
        ) {
          const answer = msg.transcript;
          setCurrentAnswer(answer);
          setAnswers((prev) => [...prev, answer]);
          console.log("[🧏‍♂️ YOU SAID]:", answer);
        }

        if (msg.type === "output_audio_buffer.stopped") {
          const newCount = speakCountRef.current + 1;
          speakCountRef.current = newCount;
          console.log(`[🔊 GPT Finished Speaking] (${newCount}/4)`);
          if (newCount === 5) {
            console.log("[✅ COMPLETE] All 4 questions spoken");
            setStatus("complete");
          }
        }

        console.log("[📥 RAW]", msg.type, msg);
      } catch (err) {
        console.warn("[⚠️ JSON PARSE ERROR]", event.data, err);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    setStatus("Negotiating SDP...");
    const sdpRes = await fetch("/api/sdp", {
      method: "POST",
      body: offer.sdp,
      headers: { "Content-Type": "application/sdp" },
    });

    const answerSDP = await sdpRes.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });
    setStatus("Connected and interviewing...");
    console.log("[📡 SDP negotiation complete]");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">GPT-4o Interview Session</h1>

      {status !== "complete" ? (
        <button
          onClick={startTest}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Start Session
        </button>
      ) : (
        <button
          onClick={async () => {
            await saveInterview(
              "user-123",
              answers.map((a, idx) => ({
                question: questions[idx],
                transcript: a,
                audioUrl: null,
              }))
            );
            const evaluationResult = await evaluateAnswers(answers, questions);
            setEvaluation(evaluationResult);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Evaluate
        </button>
      )}

      <p className="mt-4 text-sm text-gray-700">Status: {status}</p>

      {status !== "complete" && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Current Turn</h2>
          <div className="p-4 rounded-lg border border-gray-300 mt-4 bg-white shadow-sm">
            <p className="text-blue-800 font-semibold">
              <strong>Question:</strong> {currentQuestion || "Waiting..."}
            </p>
            <p className="text-green-800 mt-2">
              <strong>Previous Answer:</strong> {currentAnswer || "Waiting..."}
            </p>
          </div>
        </div>
      )}

      {status === "complete" && (
        <div className="mt-6 border-t pt-4">
          <h2 className="text-lg font-semibold mb-2">Full Conversation</h2>
          {questions.map((q, i) => (
            <div
              key={i}
              className="p-4 mb-4 border border-gray-300 rounded-lg bg-white shadow-sm"
            >
              <p className="text-blue-800 font-semibold mb-1">
                <strong>Q{i + 1}:</strong> {q}
              </p>
              <p className="text-green-800">
                <strong>A:</strong> {answers[i] || "No answer"}
              </p>
            </div>
          ))}
        </div>
      )}

      {evaluation && (
        <div className="mt-8 max-w-2xl bg-indigo-50 border border-indigo-300 p-6 rounded">
          <h3 className="text-lg font-semibold text-indigo-800 mb-2">
            Evaluation Summary
          </h3>
          <p className="text-gray-700 mb-4">{evaluation.summary}</p>
          <ul className="text-gray-800 space-y-1">
            <li>Communication: {evaluation.scores.communication}/10</li>
            <li>Problem Solving: {evaluation.scores.problemSolving}/10</li>
            <li>Technical Depth: {evaluation.scores.technicalDepth}/10</li>
            <li>Culture Fit: {evaluation.scores.cultureFit}/10</li>
            <li>Clarity & Brevity: {evaluation.scores.clarityBrevity}/10</li>
          </ul>
        </div>
      )}
    </div>
  );
}
