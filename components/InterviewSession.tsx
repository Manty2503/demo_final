"use client";

import { useState, useRef, useEffect } from "react";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { saveInterview } from "@/actions/saveInterview";

const QUESTIONS = [
  "Tell me about yourself and your experience.",
  "Describe a challenging problem you've solved.",
  "How do you approach learning new technologies?",
  "Why are you interested in this position?",
];

const evaluationSchema = z.object({
  summary: z.string().max(120),
  scores: z.object({
    communication: z.number().min(0).max(10),
    problemSolving: z.number().min(0).max(10),
    technicalDepth: z.number().min(0).max(10),
    cultureFit: z.number().min(0).max(10),
    clarityBrevity: z.number().min(0).max(10),
  }),
});

export default function InterviewSession() {
  const [status, setStatus] = useState<"idle" | "active" | "complete">("idle");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [answers, setAnswers] = useState<
    Array<{ text: string; timestamp: string }>
  >([]);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [isChannelReady, setIsChannelReady] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const channelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startInterview = async () => {
    console.log("[Interview] Starting interview process");
    try {
      setStatus("active");
      setIsChannelReady(false);
      console.log("[Status] Set to active");

      // Get ephemeral key
      console.log("[API] Fetching session from /api/sessions");
      const sessionRes = await fetch("/api/sessions");

      if (!sessionRes.ok) {
        const errorText = await sessionRes.text();
        console.error("[API Error] Session creation failed:", errorText);
        throw new Error(`Session API error: ${errorText}`);
      }

      const sessionData = await sessionRes.json();
      console.log("[API] Session data received:", sessionData);

      if (!sessionData.client_secret?.value) {
        throw new Error("No client_secret in response");
      }

      const { client_secret } = sessionData;

      // Setup WebRTC
      console.log("[WebRTC] Creating peer connection");
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE connection state:", pc.iceConnectionState);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[WebRTC] New ICE candidate:", event.candidate);
        }
      };

      // Setup audio playback
      if (audioRef.current) {
        console.log("[Audio] Setting up audio element");
        pc.ontrack = (e) => {
          console.log("[WebRTC] Received audio track:", e.track);
          if (audioRef.current && e.streams.length) {
            console.log("[Audio] Setting audio source");
            audioRef.current.srcObject = e.streams[0];
            audioRef.current
              .play()
              .catch((e) => console.error("[Audio] Playback error:", e));
          }
        };
      }

      // Get user media (audio only)
      console.log("[Media] Requesting microphone access");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[Media] Got media stream:", stream.getAudioTracks());

      pc.addTrack(stream.getAudioTracks()[0]);
      console.log("[WebRTC] Added local audio track");

      // Setup data channel for OAI events
      console.log("[WebRTC] Creating data channel");
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      // Set up channel timeout
      channelTimeoutRef.current = setTimeout(() => {
        if (!isChannelReady) {
          console.error("[DataChannel] Channel failed to open within timeout");
          // You might want to handle this error state in your UI
        }
      }, 10000); // 10 second timeout

      dc.onopen = () => {
        console.log("[DataChannel] Channel opened");
        setIsChannelReady(true);
        if (channelTimeoutRef.current) {
          clearTimeout(channelTimeoutRef.current);
        }
        askQuestion(0);
      };

      dc.onclose = () => {
        console.log("[DataChannel] Channel closed");
        setIsChannelReady(false);
      };

      dc.onerror = (e) => console.error("[DataChannel] Error:", e);
      dc.onmessage = handleDataChannelMessage;

      // Create SDP offer and set local description
      console.log("[WebRTC] Creating offer");
      const offer = await pc.createOffer();
      console.log("[WebRTC] Offer created:", offer.type);

      await pc.setLocalDescription(offer);
      console.log("[WebRTC] Local description set");

      // Send offer to signaling API with model and ephemeral key
      console.log("[API] Sending offer to /api/webrtc");
      const signalingRes = await fetch("/api/webrtc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sdp: offer.sdp,
          model: "gpt-4o-realtime-preview-2024-12-17",
          ephemeralKey: client_secret.value,
        }),
      });

      if (!signalingRes.ok) {
        const errorText = await signalingRes.text();
        console.error("[API Error] Signaling failed:", errorText);
        throw new Error(`Signaling API error: ${errorText}`);
      }

      const { sdp } = await signalingRes.json();
      console.log("[WebRTC] Received answer SDP");

      await pc.setRemoteDescription({ type: "answer", sdp });
      console.log("[WebRTC] Remote description set");
    } catch (error) {
      console.error("[Interview] Startup failed:", error);
      setStatus("idle");
      setIsChannelReady(false);
      if (channelTimeoutRef.current) {
        clearTimeout(channelTimeoutRef.current);
      }
    }
  };

  const handleDataChannelMessage = (event: MessageEvent) => {
    try {
      console.log("[DataChannel] Received message:", event.data);
      const data = JSON.parse(event.data);
      console.log("[DataChannel] Parsed data:", data);

      if (data.event === "transcript" && data.text) {
        console.log("[Transcript] Update:", data.text);
        setTranscript(data.text);

        if (data.is_final) {
          console.log("[Transcript] Final answer detected");
          saveAnswer(data.text);
        }
      }
    } catch (error) {
      console.error("[DataChannel] Message handling error:", error);
    }
  };

  const speakText = (text: string, onEnd?: () => void) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    if (onEnd) utterance.onend = onEnd;

    window.speechSynthesis.speak(utterance);
  };

  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];

  const startRecordingAnswer = (onStop: (audioBlob: Blob) => void) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Media devices API not supported.");
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        onStop(audioBlob);
        stream.getTracks().forEach((track) => track.stop()); // stop mic
      };

      mediaRecorder.start();

      // Automatically stop recording after 10 seconds
      setTimeout(() => {
        mediaRecorder?.stop();
      }, 10000); // 10,000 ms = 10 seconds
    });
  };

  const askQuestion = (index: number) => {
    const channel = dcRef.current;
    if (!channel || channel.readyState !== "open") {
      console.log("[DataChannel] Waiting for channel to be ready...");
      return;
    }

    const questionText = QUESTIONS[index];

    // Speak question first
    speakText(questionText, () => {
      // After speaking question, start recording answer
      console.log("[Recorder] Start capturing answer for 10 seconds...");

      startRecordingAnswer(async (audioBlob) => {
        console.log("[Recorder] Recording stopped, processing answer...");

        // Send the audioBlob or convert it to base64/audio buffer to your model or backend here
        // Example: channel.send(audioBlob) — but normally you send transcription or upload audio somewhere

        // For now, just logging
        console.log("Captured audio blob size:", audioBlob.size);

        // Trigger model response after receiving the answer
        const triggerResponse = {
          type: "response.create",
          response: { modalities: ["audio", "text"] },
        };
        channel.send(JSON.stringify(triggerResponse));

        // Move to next question after model responds (or after a delay)
        setTimeout(() => {
          if (index + 1 < QUESTIONS.length) {
            askQuestion(index + 1);
          } else {
            console.log("Interview complete.");
          }
        }, 5000); // wait 5 seconds before next question
      });
    });

    setCurrentQuestion(index);
    setTranscript("");
  };

  const saveAnswer = (text: string) => {
    console.log("[Interview] Saving answer:", text);
    const newAnswers = [
      ...answers,
      {
        text,
        timestamp: new Date().toISOString(),
      },
    ];
    setAnswers(newAnswers);

    if (currentQuestion < QUESTIONS.length - 1) {
      console.log("[Interview] Moving to next question");
      setTimeout(() => askQuestion(currentQuestion + 1), 1000);
    } else {
      console.log("[Interview] All questions completed");
      endInterview();
    }
  };

  const endInterview = async () => {
    console.log("[Interview] Ending interview");
    if (pcRef.current) {
      console.log("[WebRTC] Closing connection");
      pcRef.current.getSenders().forEach((s) => {
        console.log("[WebRTC] Stopping sender track:", s.track?.id);
        s.track?.stop();
      });
      pcRef.current.close();
    }
    setStatus("complete");
    setIsChannelReady(false);
    if (channelTimeoutRef.current) {
      clearTimeout(channelTimeoutRef.current);
    }
    await generateEvaluation();
  };

  const generateEvaluation = async () => {
    console.log("[Evaluation] Generating evaluation");
    try {
      const prompt = `Analyze this interview:\n\n${QUESTIONS.map(
        (q, i) => `Q: ${q}\nA: ${answers[i]?.text || "No answer"}`
      ).join("\n\n")}`;

      console.log("[AI] Sending prompt to generateObject:", prompt);

      const { object } = await generateObject({
        model: openai.chat("gpt-4"),
        schema: evaluationSchema,
        prompt,
      });

      console.log("[AI] Evaluation received:", object);
      setEvaluation(object);

      // Call server action to save the interview data
      console.log("[DB] Saving interview data");
      await saveInterview({
        userId: "user-id-here", // Replace with actual user ID
        questions: QUESTIONS,
        answers,
        summary: object.summary,
        scores: object.scores,
      });
      console.log("[DB] Interview data saved");
    } catch (error) {
      console.error("[Evaluation] Generation failed:", error);
    }
  };

  useEffect(() => {
    console.log("[Component] Mounted");
    return () => {
      console.log("[Component] Unmounting - cleaning up");
      if (pcRef.current) pcRef.current.close();
      if (channelTimeoutRef.current) clearTimeout(channelTimeoutRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-100 via-white to-indigo-100 flex flex-col items-center p-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-indigo-700 mb-2">
          AI Interviewer
        </h1>
        <p className="text-indigo-500 max-w-xl mx-auto">
          Conduct a voice-based interview with AI, get a summary and scoring.
        </p>
      </header>

      {status === "idle" && (
        <button
          onClick={startInterview}
          className="px-6 py-3 bg-indigo-600 text-white rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-400"
        >
          Start Interview
        </button>
      )}

      {(status === "active" || status === "complete") && (
        <div className="max-w-3xl w-full space-y-8">
          <div className="bg-white shadow-md rounded-md p-6">
            <h2 className="text-xl font-semibold mb-2 text-indigo-800">
              Question {currentQuestion + 1} / {QUESTIONS.length}
            </h2>
            <p className="text-lg italic text-gray-700">
              {QUESTIONS[currentQuestion]}
            </p>
          </div>

          <div className="bg-white shadow-md rounded-md p-6 min-h-[120px] flex items-center justify-center text-gray-800 font-medium text-lg animate-fadeIn">
            {transcript || (
              <span className="text-gray-400 italic">
                Waiting for your answer...
              </span>
            )}
          </div>

          {status === "active" && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={endInterview}
                className="px-6 py-3 bg-red-600 text-white rounded-md shadow-md hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-400"
              >
                End Interview
              </button>
            </div>
          )}

          {status === "complete" && evaluation && (
            <div className="bg-indigo-50 border border-indigo-300 rounded-md p-6">
              <h3 className="text-xl font-bold mb-4 text-indigo-700">
                Interview Summary & Scores
              </h3>
              <p className="mb-4 text-gray-800">{evaluation.summary}</p>

              <div className="grid grid-cols-2 gap-4 text-indigo-900 font-semibold">
                <div>Communication:</div>
                <div>{evaluation.scores.communication}/10</div>
                <div>Problem Solving:</div>
                <div>{evaluation.scores.problemSolving}/10</div>
                <div>Technical Depth:</div>
                <div>{evaluation.scores.technicalDepth}/10</div>
                <div>Culture Fit:</div>
                <div>{evaluation.scores.cultureFit}/10</div>
                <div>Clarity & Brevity:</div>
                <div>{evaluation.scores.clarityBrevity}/10</div>
              </div>
            </div>
          )}
        </div>
      )}

      <audio ref={audioRef} hidden />

      {status === "active" && !isChannelReady && (
        <div className="mt-6 flex items-center space-x-3 text-indigo-600 font-semibold">
          <svg
            className="animate-spin h-5 w-5 text-indigo-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
          <span>Connecting to AI Interviewer...</span>
        </div>
      )}

      <footer className="mt-auto py-6 text-center text-indigo-400 text-sm select-none">
        Powered by OpenAI Realtime WebRTC API & Next.js
      </footer>

      <style>{`
        @keyframes fadeIn {
          from {opacity: 0;}
          to {opacity: 1;}
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-in-out;
        }
      `}</style>
    </div>
  );
}
