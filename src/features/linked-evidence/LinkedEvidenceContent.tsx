"use client";

import { useState } from "react";

interface Segment {
  speaker: string;
  timestampStart: number;
  timestampEnd: number;
  text: string;
}

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

const BLOCKS: Array<{ key: keyof SOAPNote; label: string }> = [
  { key: "subjective", label: "Subjetivo" },
  { key: "objective", label: "Objetivo" },
  { key: "assessment", label: "Evaluación" },
  { key: "plan", label: "Plan" },
];

function buildEvidenceMap(soap: SOAPNote, segments: Segment[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const block of BLOCKS) {
    const text = (soap[block.key] ?? "").toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 2) continue;
    const indices: number[] = [];
    segments.forEach((seg, i) => {
      const segWords = seg.text.toLowerCase().split(/\s+/).filter(Boolean);
      const overlap = words.filter((w) => segWords.includes(w)).length;
      if (overlap >= 2) indices.push(i);
    });
    if (indices.length > 0) map.set(block.key, indices);
  }
  return map;
}

interface LinkedEvidenceContentProps {
  soap: SOAPNote;
  transcript: { segments: Segment[] };
  embedded?: boolean;
}

export function LinkedEvidenceContent({
  soap,
  transcript,
  embedded = false,
}: LinkedEvidenceContentProps) {
  const [highlightedBlock, setHighlightedBlock] = useState<string | null>(null);
  const [highlightedSegments, setHighlightedSegments] = useState<Set<number>>(new Set());

  const evidenceMap = buildEvidenceMap(soap, transcript.segments);

  const handleBlockClick = (blockKey: string) => {
    const indices = evidenceMap.get(blockKey);
    setHighlightedBlock(blockKey);
    setHighlightedSegments(indices ? new Set(indices) : new Set());
  };

  const handleSegmentClick = (index: number) => {
    setHighlightedBlock(null);
    Array.from(evidenceMap.entries()).forEach(([blockKey, indices]) => {
      if (indices.includes(index)) {
        setHighlightedBlock(blockKey);
      }
    });
    setHighlightedSegments(new Set([index]));
  };

  const containerClass = embedded
    ? "h-full flex overflow-hidden min-h-0"
    : "flex-1 flex overflow-hidden min-h-0";

  return (
    <div className={containerClass}>
      <div className="flex-1 min-w-0 border-r border-rene-aquaDark/60 overflow-y-auto p-4 bg-white">
        <h2 className="font-medium mb-4 text-gray-800">Nota SOAP</h2>
        {BLOCKS.map(({ key, label }) => (
          <div
            key={key}
            onClick={() => handleBlockClick(key)}
            className={`mb-4 p-3 rounded-lg cursor-pointer transition ${
              highlightedBlock === key
                ? "bg-rene-aquaDark/50 ring-2 ring-rene-green"
                : "bg-rene-aqua/50 hover:bg-rene-aquaDark/30"
            }`}
          >
            <h3 className="text-sm font-medium text-gray-600 mb-2">{label}</h3>
            <p className="text-sm whitespace-pre-wrap">{soap[key] ?? ""}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto p-4 bg-rene-aqua/30">
        <h2 className="font-medium mb-4 text-gray-800">Transcripción</h2>
        <div className="space-y-2">
          {transcript.segments.map((seg, i) => (
            <div
              key={i}
              onClick={() => handleSegmentClick(i)}
              className={`p-3 rounded-lg cursor-pointer transition ${
                highlightedSegments.has(i)
                  ? "bg-rene-aquaDark/50 ring-2 ring-rene-green"
                  : "bg-white border border-rene-aquaDark/40 hover:border-rene-aquaDark/60"
              }`}
            >
              <span className="text-xs text-gray-500 font-medium">
                [{seg.speaker}] {seg.timestampStart}s - {seg.timestampEnd}s
              </span>
              <p className="text-sm mt-1">{seg.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
