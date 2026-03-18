"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

type RecordingState = "idle" | "recording" | "processing";

export function RecorderScreen() {
  const [state, setState] = useState<RecordingState>("idle");
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const startTimer = useCallback(() => {
    setTimer(0);
    timerRef.current = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setError("Tu navegador no soporta grabación de audio. Probá con Chrome o Edge.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000);
      setState("recording");
      startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al acceder al micrófono");
    }
  }, [startTimer]);

  const stopRecording = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== "recording") return;

    mr.stop();
    mr.stream.getTracks().forEach((t) => t.stop());
    stopTimer();
    setState("processing");

    const chunks = chunksRef.current;
    if (chunks.length === 0) {
      setError("La grabación está vacía. Grabá al menos unos segundos.");
      setState("idle");
      return;
    }

    const blob = new Blob(chunks, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    try {
      const res = await fetch("/api/visits/process", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al procesar");
      }

      const data = await res.json();
      router.push(`/dashboard?visitId=${data.visitId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar");
      setState("idle");
    }
  }, [stopTimer, router]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="min-h-[calc(100vh-3.5rem)] bg-rene-aqua flex flex-col items-center justify-center p-6"
      style={{
        minHeight: "calc(100vh - 3.5rem)",
        backgroundColor: "#f0fdfa",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        className="w-full max-w-md flex flex-col items-center gap-8"
        style={{ width: "100%", maxWidth: "28rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem" }}
      >
        <h1 className="text-2xl font-semibold text-gray-800" style={{ fontSize: "1.5rem", fontWeight: 600, color: "#1f2937", margin: 0 }}>
          {state === "recording"
            ? "Grabando consulta"
            : state === "processing"
              ? "Procesando…"
              : "Rene"}
        </h1>

        <div className="w-full aspect-video max-h-32 bg-rene-aquaDark/50 rounded-xl flex items-center justify-center overflow-hidden">
          {state === "recording" && (
            <WaveformAnimation />
          )}
          {state === "processing" && (
            <div className="flex gap-2">
              <span className="w-2 h-8 bg-gray-600 rounded animate-pulse" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-8 bg-gray-600 rounded animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-8 bg-gray-600 rounded animate-pulse" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>

        <div className="text-3xl font-mono text-gray-700 tabular-nums" style={{ fontSize: "1.875rem", fontFamily: "monospace", color: "#374151" }}>
          {formatTime(timer)}
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}

        <button
          type="button"
          onClick={state === "recording" ? stopRecording : startRecording}
          disabled={state === "processing"}
          style={{
            width: "6rem",
            height: "6rem",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 500,
            border: "none",
            cursor: state === "processing" ? "not-allowed" : "pointer",
            backgroundColor: state === "recording" ? "#ef4444" : state === "processing" ? "#9ca3af" : "#14b8a6",
          }}
          className={`shadow-lg transition touch-manipulation ${
            state === "recording"
              ? "bg-red-500 hover:bg-red-600"
              : state === "processing"
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-rene-green hover:bg-rene-greenDark"
          }`}
        >
          {state === "recording" ? (
            <span className="w-8 h-8 rounded bg-white" />
          ) : state === "processing" ? (
            <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[36px] border-b-white ml-1" />
          )}
        </button>

        <p className="text-sm text-gray-600" style={{ fontSize: "0.875rem", color: "#4b5563", margin: 0 }}>
          {state === "idle" && "Tocá para grabar"}
          {state === "recording" && "Tocá para detener"}
          {state === "processing" && "Transcribiendo y generando nota…"}
        </p>
      </div>
    </div>
  );
}

function WaveformAnimation() {
  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="w-1.5 bg-gray-600 rounded-full animate-pulse"
          style={{
            height: `${12 + Math.random() * 24}px`,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}
