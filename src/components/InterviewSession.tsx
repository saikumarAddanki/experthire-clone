"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { roundTypeLabel } from "@/lib/roundTypes";

interface QuestionState {
  id: string;
  order: number;
  questionText: string;
  answerText: string | null;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type Intent = "repeat" | "clarify" | "answer";

const REPEAT_PATTERN = /\b(repeat|say (that|it) again|come again|didn'?t (catch|hear|get) that|one more time)\b/i;
const CLARIFY_PATTERN = /\b(clarify|what do you mean|can you explain|not (clear|sure what)|don'?t understand|elaborate|rephrase)\b/i;
const SHORT_UTTERANCE_MAX = 70;
const SILENCE_AUTO_ADVANCE_MS = 2000;

function detectIntent(text: string): Intent {
  const trimmed = text.trim();
  if (trimmed.length > SHORT_UTTERANCE_MAX) return "answer";
  if (REPEAT_PATTERN.test(trimmed)) return "repeat";
  if (CLARIFY_PATTERN.test(trimmed)) return "clarify";
  return "answer";
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

function MicIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 2l20 20" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M15 9.34V5a3 3 0 0 0-5.94-.6" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function CameraIcon({ off }: { off: boolean }) {
  return off ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 2l20 20" />
      <path d="M15 8h.01" />
      <path d="M21 8l-5 3v2l5 3V8Z" />
      <rect x="3" y="6" width="12" height="12" rx="2" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 8l-5 3v2l5 3V8Z" />
      <rect x="3" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function EndCallIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 8.5c-3.6 0-6.9 1-9.5 2.6a1.5 1.5 0 0 0-.4 2.2l1.6 2.1a1.5 1.5 0 0 0 2 .4l2-1.1a1.5 1.5 0 0 0 .8-1.4l-.1-1.4c1-.3 2.2-.5 3.6-.5s2.6.2 3.6.5l-.1 1.4a1.5 1.5 0 0 0 .8 1.4l2 1.1a1.5 1.5 0 0 0 2-.4l1.6-2.1a1.5 1.5 0 0 0-.4-2.2C18.9 9.5 15.6 8.5 12 8.5Z" />
    </svg>
  );
}

function PersonPlaceholder() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

export default function InterviewSession({
  interviewId,
  jobTitle,
  companyName,
  roundType,
  durationMinutes,
  createdAt,
  initialQuestions,
}: {
  interviewId: string;
  jobTitle: string;
  companyName?: string | null;
  roundType: string;
  durationMinutes: number;
  createdAt: string;
  initialQuestions: QuestionState[];
}) {
  const router = useRouter();
  const [questions] = useState<QuestionState[]>(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const firstUnanswered = initialQuestions.findIndex((q) => !q.answerText);
    return firstUnanswered === -1 ? initialQuestions.length - 1 : firstUnanswered;
  });
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTypeInput, setShowTypeInput] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [caption, setCaption] = useState<{ text: string; source: "ai" | "user" } | null>(null);
  const [clarifying, setClarifying] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    return durationMinutes * 60 - elapsedMs / 1000;
  });

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTranscriptRef = useRef("");
  const wantListeningRef = useRef(false);
  const speakingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const answerRef = useRef("");
  const submittingRef = useRef(false);
  const clarifyingRef = useRef(false);
  const showTypeInputRef = useRef(false);
  const handleSendRef = useRef<() => void>(() => {});

  const currentQuestion = questions[currentIndex];
  const isCodingRound = roundType === "CODING";
  const totalSeconds = durationMinutes * 60;
  const elapsedFraction = Math.min(1, Math.max(0, 1 - remainingSeconds / totalSeconds));
  const timeUp = remainingSeconds <= 0;
  const lastMinute = remainingSeconds <= 60 && remainingSeconds > 0;
  const isLastQuestion = currentIndex >= questions.length - 1;

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);
  useEffect(() => {
    clarifyingRef.current = clarifying;
  }, [clarifying]);
  useEffect(() => {
    showTypeInputRef.current = showTypeInput;
  }, [showTypeInput]);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsedMs = Date.now() - new Date(createdAt).getTime();
      setRemainingSeconds(durationMinutes * 60 - elapsedMs / 1000);
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt, durationMinutes]);

  const showCaption = useCallback((text: string, source: "ai" | "user") => {
    if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
    setCaption({ text, source });
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const autoStartListening = useCallback(() => {
    if (!recognitionRef.current || showTypeInputRef.current || isCodingRound) return;
    baseTranscriptRef.current = "";
    wantListeningRef.current = true;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      setListening(false);
      wantListeningRef.current = false;
    }
  }, [isCodingRound]);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        autoStartListening();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.onstart = () => {
        setSpeaking(true);
        speakingRef.current = true;
        showCaption(text, "ai");
      };
      utterance.onend = () => {
        setSpeaking(false);
        speakingRef.current = false;
        if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
        captionTimeoutRef.current = setTimeout(() => setCaption(null), 1200);
        autoStartListening();
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [showCaption, autoStartListening]
  );

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoiceSupported(true);
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e: SpeechRecognitionEventLike) => {
      if (speakingRef.current) {
        window.speechSynthesis?.cancel();
        speakingRef.current = false;
        setSpeaking(false);
      }

      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (final) baseTranscriptRef.current += final;
      const combined = (baseTranscriptRef.current + " " + interim).trim();
      setAnswer(combined);
      answerRef.current = combined;
      if (combined) showCaption(combined, "user");

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (answerRef.current.trim() && !submittingRef.current && !clarifyingRef.current) {
          handleSendRef.current?.();
        }
      }, SILENCE_AUTO_ADVANCE_MS);
    };

    recognition.onerror = (e: SpeechRecognitionErrorEventLike) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setVoiceError("Microphone access was blocked. Allow mic permission in your browser to use voice input.");
        wantListeningRef.current = false;
        setListening(false);
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setVoiceError("Voice input hit a snag — you can type instead.");
      }
    };

    recognition.onend = () => {
      if (!wantListeningRef.current) {
        setListening(false);
        return;
      }

      if (answerRef.current.trim() && !submittingRef.current && !clarifyingRef.current) {
        wantListeningRef.current = false;
        setListening(false);
        handleSendRef.current?.();
        return;
      }

      try {
        recognition.start();
      } catch {
        setListening(false);
        wantListeningRef.current = false;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      wantListeningRef.current = false;
      recognition.onend = null;
      recognition.abort();
    };
  }, [showCaption]);

  useEffect(() => {
    if (!currentQuestion) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    speak(currentQuestion.questionText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearSilenceTimer();
    };
  }, [clearSilenceTimer]);

  async function toggleCamera() {
    setCameraError(null);
    if (cameraOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCameraOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      setCameraError("Couldn't access your camera — check browser permissions.");
    }
  }

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    clearSilenceTimer();
  }, [clearSilenceTimer]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      setShowTypeInput(true);
      return;
    }
    setVoiceError(null);
    if (listening) {
      stopListening();
    } else {
      baseTranscriptRef.current = answer ? answer + " " : "";
      wantListeningRef.current = true;
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        // start() throws if already started — safe to ignore
      }
    }
  }, [listening, answer, stopListening]);

  async function runFinish() {
    setFinishing(true);
    try {
      const finishRes = await fetch(`/api/interviews/${interviewId}/finish`, { method: "POST" });
      if (!finishRes.ok) {
        const data = await finishRes.json().catch(() => ({}));
        setError(data.error ?? "Could not generate your feedback. Please try again.");
        setFinishing(false);
        return;
      }
      router.push(`/interview/${interviewId}/feedback`);
    } catch {
      setError("Could not generate your feedback. Please try again.");
      setFinishing(false);
    }
  }

  async function submitAnswer(forceFinish: boolean) {
    if (!currentQuestion) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    stopListening();
    window.speechSynthesis?.cancel();

    const submittedText = answer.trim();
    setAnswer("");
    baseTranscriptRef.current = "";
    answerRef.current = "";
    setCaption(null);

    try {
      const res = await fetch(`/api/interviews/${interviewId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: currentQuestion.id, answerText: submittedText }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setSubmitting(false);
        submittingRef.current = false;
        return;
      }

      const bankExhausted = data.bankExhausted || isLastQuestion;

      if (forceFinish || bankExhausted) {
        setSubmitting(false);
        submittingRef.current = false;
        await runFinish();
        return;
      }

      setCurrentIndex((i) => i + 1);
      setSubmitting(false);
      submittingRef.current = false;
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  async function handleClarify() {
    if (!currentQuestion) return;
    stopListening();
    setAnswer("");
    baseTranscriptRef.current = "";
    answerRef.current = "";
    setClarifying(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: currentQuestion.id }),
      });
      const data = await res.json();
      if (res.ok && data.clarification) {
        speak(data.clarification);
      }
    } catch {
      // Silent — worst case, they just ask again or type their answer.
    } finally {
      setClarifying(false);
    }
  }

  function handleRepeat() {
    if (!currentQuestion) return;
    stopListening();
    setAnswer("");
    baseTranscriptRef.current = "";
    answerRef.current = "";
    speak(currentQuestion.questionText);
  }

  async function handleSend() {
    if (submittingRef.current || clarifyingRef.current) return;
    const trimmed = answerRef.current.trim();
    if (!trimmed) return;

    const intent = detectIntent(trimmed);
    if (intent === "repeat") {
      handleRepeat();
      return;
    }
    if (intent === "clarify") {
      await handleClarify();
      return;
    }
    await submitAnswer(lastMinute || timeUp);
  }

  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  async function handleEndInterview() {
    stopListening();
    const hasAnsweredBefore = questions.some((q) => q.answerText) || currentIndex > 0;
    if (answer.trim() && detectIntent(answer.trim()) === "answer") {
      await submitAnswer(true);
    } else if (hasAnsweredBefore) {
      await runFinish();
    } else {
      setError("Answer at least one question before ending the interview.");
    }
  }

  useEffect(() => {
    if (timeUp && !finishing && !submitting) {
      const hasAnsweredBefore = questions.some((q) => q.answerText) || currentIndex > 0;
      if (hasAnsweredBefore && !answer.trim()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        runFinish();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  if (finishing) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <div className="w-3 h-3 rounded-full mx-auto mb-6 mic-active" style={{ background: "var(--accent)" }} />
        <h2 className="text-2xl font-semibold mb-2">Scoring your interview…</h2>
        <p style={{ color: "var(--text-muted)" }}>This usually takes a few seconds.</p>
      </div>
    );
  }

  const showSendButton = isCodingRound || showTypeInput || !voiceSupported;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-3 text-sm" style={{ color: "var(--text-muted)" }}>
        <span>
          {jobTitle}
          {companyName ? ` · ${companyName}` : ""} · {roundTypeLabel(roundType)}
        </span>
        <span className="flex items-center gap-3">
          <span style={{ color: "var(--text-muted)" }}>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span style={lastMinute ? { color: "var(--warn)", fontWeight: 600 } : undefined}>
            {timeUp ? "Time's up" : `${formatTime(remainingSeconds)} left`}
          </span>
        </span>
      </div>
      <div className="h-1.5 rounded-full mb-5" style={{ background: "var(--border)" }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ background: lastMinute ? "var(--warn)" : "var(--accent)", width: `${elapsedFraction * 100}%` }}
        />
      </div>

      {lastMinute && (
        <div
          className="text-sm rounded-lg px-4 py-2.5 mb-4"
          style={{ background: "rgba(240, 180, 41, 0.12)", color: "var(--warn)" }}
        >
          ⏱ Less than a minute left — wrap up your answer, this will be the last question.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4" style={{ aspectRatio: "16 / 9" }}>
        <div className="card relative overflow-hidden flex items-center justify-center">
          {cameraOn ? (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}
            >
              <PersonPlaceholder />
            </div>
          )}
          <span className="absolute bottom-2 left-2 text-xs px-2 py-1 rounded-md" style={{ background: "rgba(0,0,0,0.5)" }}>
            You {listening && "🎙️"}
          </span>
        </div>

        <div className="card relative overflow-hidden flex items-center justify-center">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${speaking ? "avatar-speaking" : ""}`}
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
          >
            <span className="font-[family-name:var(--font-display)] font-semibold text-lg" style={{ color: "var(--accent)" }}>
              AI
            </span>
          </div>
          <span className="absolute bottom-2 left-2 text-xs px-2 py-1 rounded-md" style={{ background: "rgba(0,0,0,0.5)" }}>
            Interviewer {(speaking || clarifying || submitting) && "💬"}
          </span>
        </div>
      </div>

      <div className="min-h-[3.5rem] mb-4 flex flex-col items-center justify-start gap-1">
        {caption && (
          <p
            key={caption.text}
            className="caption-enter text-center text-sm sm:text-base px-4 py-2.5 rounded-lg max-w-xl"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: caption.source === "ai" ? "var(--text)" : "var(--accent)",
            }}
          >
            {caption.text}
          </p>
        )}
        {clarifying && !caption && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Getting a clarification…
          </p>
        )}
        {submitting && !clarifying && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Moving to the next question…
          </p>
        )}
        {!isCodingRound && !showTypeInput && voiceSupported && listening && !submitting && !clarifying && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Pause for ~2 seconds when you&apos;re done answering — it moves on automatically.
          </p>
        )}
      </div>

      {cameraError && (
        <p className="text-xs text-center mb-2" style={{ color: "var(--warn)" }}>
          {cameraError}
        </p>
      )}
      {voiceError && (
        <p className="text-xs text-center mb-2" style={{ color: "var(--warn)" }}>
          {voiceError}
        </p>
      )}

      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          type="button"
          onClick={toggleListening}
          disabled={submitting}
          className={`call-control-btn ${listening ? "active" : ""}`}
          title={listening ? "Mute" : "Unmute"}
          aria-label={listening ? "Mute microphone" : "Unmute microphone"}
        >
          <MicIcon muted={!listening} />
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          className={`call-control-btn ${cameraOn ? "active" : ""}`}
          title={cameraOn ? "Turn camera off" : "Turn camera on"}
          aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
        >
          <CameraIcon off={!cameraOn} />
        </button>

        <button
          type="button"
          onClick={handleEndInterview}
          disabled={submitting}
          className="call-control-btn danger"
          title="End interview"
          aria-label="End interview"
        >
          <EndCallIcon />
        </button>
      </div>

      <div className="space-y-2">
        {isCodingRound ? (
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
              Code editor — write your approach in any language, pseudocode is fine
            </label>
            <textarea
              className="input font-mono text-sm"
              rows={10}
              spellCheck={false}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const target = e.currentTarget;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const next = answer.slice(0, start) + "  " + answer.slice(end);
                  setAnswer(next);
                  requestAnimationFrame(() => {
                    target.selectionStart = target.selectionEnd = start + 2;
                  });
                }
              }}
              placeholder="def solve(...):\n    # write code, pseudocode, or describe your approach"
              disabled={submitting}
            />
          </div>
        ) : (
          <>
            {!showTypeInput && (
              <button
                type="button"
                onClick={() => {
                  setShowTypeInput(true);
                  stopListening();
                }}
                className="text-sm mx-auto block"
                style={{ color: "var(--text-muted)" }}
              >
                Type instead
              </button>
            )}

            {showTypeInput && (
              <textarea
                className="input"
                rows={3}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={
                  voiceSupported
                    ? "Type your answer, or say “repeat that” / “can you clarify”…"
                    : "Type your answer…"
                }
                disabled={submitting}
              />
            )}
          </>
        )}

        {showSendButton && (
          <button
            type="button"
            onClick={handleSend}
            disabled={submitting || clarifying || !answer.trim()}
            className="btn-primary w-full"
          >
            {submitting
              ? "Submitting…"
              : clarifying
                ? "One moment…"
                : lastMinute || timeUp || isLastQuestion
                  ? "Finish interview"
                  : "Send"}
          </button>
        )}

        {error && (
          <p className="text-sm text-center" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
