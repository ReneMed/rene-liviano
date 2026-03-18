"use client";

import { useRef, useEffect } from "react";
import { useConsultationStore } from "@/shared/store/useConsultationStore";

interface AudioPlayerProps {
  visitId: string;
}

export function AudioPlayer({ visitId }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { setCurrentTime } = useConsultationStore();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [setCurrentTime]);

  return (
    <div
      className="bg-rene-aqua/50 border border-rene-aquaDark/40 rounded-lg px-3 py-2 flex items-center gap-2 min-w-0 max-w-[280px] shrink-0"
      data-visit-id={visitId}
    >
      <span className="text-xs text-gray-500 shrink-0">Audio</span>
      <audio ref={audioRef} controls className="h-8 min-w-0 flex-1" src={undefined} />
    </div>
  );
}
