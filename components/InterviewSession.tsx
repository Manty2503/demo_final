// app/interview/InterviewSession.tsx
"use client";

import { evaluateAnswers, Evaluation } from "@/actions/evaluateInterview";
import { saveInterview } from "@/actions/saveInterview";
import { useState } from "react";

const QUESTIONS = [
  "Tell me about yourself and your experience.",
  "Describe a challenging problem you've solved.",
  "How do you approach learning new technologies?",
  "Why are you interested in this position?",
];

export default function InterviewSession() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [status, setStatus] = useState<"idle" | "recording" | "complete">(
    "idle"
  );
  const [answers, setAnswers] = useState<
    Array<{
      question: string;
      audio: Blob;
      transcript: string;
      timestamp: string;
    }>
  >([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

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

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append("file", audioBlob, "answer.webm");
    formData.append("model", "whisper-1");

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    return data.text;
  };

  

  const startRecordingAnswer = (onStop: (audioBlob: Blob) => void) => {
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
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder?.stop(), 10000);
    });
  };

  const askQuestion = (index: number) => {
    const questionText = QUESTIONS[index];
    setStatus("recording");

    speakText(questionText, () => {
      startRecordingAnswer(async (audioBlob) => {
        const timestamp = new Date().toISOString();
        const transcript = await transcribeAudio(audioBlob);

        setAnswers((prev) => [
          ...prev,
          { question: questionText, audio: audioBlob, transcript, timestamp },
        ]);

        if (index + 1 < QUESTIONS.length) {
          setTimeout(() => askQuestion(index + 1), 1000);
        } else {
          setStatus("complete");
        }
      });
    });

    setCurrentQuestion(index);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <h1 className="text-3xl font-bold text-indigo-700 mb-4">
        AI Interviewer
      </h1>
      {status === "idle" && (
        <button
          className="bg-indigo-600 text-white px-6 py-3 rounded shadow"
          onClick={() => askQuestion(0)}
        >
          Start Interview
        </button>
      )}

      {status !== "idle" && (
        <div className="text-center space-y-4">
          <h2 className="text-xl text-gray-700">
            Question {currentQuestion + 1} of {QUESTIONS.length}
          </h2>
          <p className="italic text-gray-600">{QUESTIONS[currentQuestion]}</p>
          {status === "recording" && (
            <p className="text-red-500">Recording your answer...</p>
          )}
          {status === "complete" && (
            <div className="text-center space-y-4">
              <p className="text-green-600">Interview complete. Thanks!</p>
              <button
                className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded shadow"
                onClick={async () => {
                  const finalTranscriptList = answers.map((a) => a.transcript);
                  await saveInterview(
                    "user-123",
                    answers.map((a) => ({
                      question: a.question,
                      transcript: a.transcript,
                      audioUrl: null,
                    }))
                  );
                  const evaluationResult = await evaluateAnswers(
                    finalTranscriptList,
                    QUESTIONS
                  );
                  setEvaluation(evaluationResult);
                }}
              >
                Evaluate Interview
              </button>
            </div>
          )}
        </div>
      )}

      {status === "complete" && answers.length > 0 && (
        <div className="mt-8 w-full max-w-xl">
          <h2 className="text-xl font-semibold text-indigo-700 mb-4">
            Your Responses
          </h2>
          <ul className="space-y-4">
            {answers.map((item, idx) => (
              <li key={idx} className="p-4 border border-gray-200 rounded">
                <p className="font-medium text-gray-800">Q: {item.question}</p>
                <p className="text-sm text-gray-500 mb-2">
                  Transcript: {item.transcript}
                </p>
                <audio controls className="mt-2 w-full">
                  <source
                    src={URL.createObjectURL(item.audio)}
                    type="audio/webm"
                  />
                  Your browser does not support the audio element.
                </audio>
              </li>
            ))}
          </ul>
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
