"use client";

import { useState } from "react";
import { SOAPEditor } from "./SOAPEditor";
import { LinkedEvidenceContent } from "@/features/linked-evidence/LinkedEvidenceContent";

interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface NotesLeftPanelProps {
  soap: SOAPNote;
  onSoapChange: (soap: SOAPNote) => void;
  onSave: () => void;
  transcript?: {
    segments: Array<{
      speaker: string;
      timestampStart: number;
      timestampEnd: number;
      text: string;
    }>;
  } | null;
}

type TabId = "nota" | "transcripcion" | "evidencia";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "nota", label: "Nota clínica" },
  { id: "transcripcion", label: "Transcripción de la consulta" },
  { id: "evidencia", label: "Evidencia enlazada" },
];

export function NotesLeftPanel({ soap, onSoapChange, onSave, transcript }: NotesLeftPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("nota");
  const hasTranscript = transcript?.segments && transcript.segments.length > 0;
  const canShowEvidence = hasTranscript && soap && Object.values(soap).some((v) => v?.trim());

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border border-rene-aquaDark/40 rounded-lg overflow-hidden">
      <div className="flex border-b border-rene-aquaDark/40 shrink-0 overflow-x-auto">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${
              activeTab === id
                ? "border-rene-green text-rene-green"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === "nota" && (
          <div className="h-full overflow-auto p-4">
            <SOAPEditor soap={soap} onChange={onSoapChange} onSave={onSave} />
          </div>
        )}
        {activeTab === "transcripcion" && (
          <div className="h-full overflow-auto p-4 bg-rene-aqua/50">
            {hasTranscript ? (
              <div className="text-sm text-gray-700 space-y-1">
                {transcript!.segments.map((s, i) => (
                  <p key={i}>
                    <span className="font-medium text-gray-500">{s.speaker}:</span> {s.text}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Sin transcripción disponible.</p>
            )}
          </div>
        )}
        {activeTab === "evidencia" && (
          <div className="h-full overflow-hidden min-h-0">
            {canShowEvidence ? (
              <LinkedEvidenceContent soap={soap} transcript={transcript!} embedded />
            ) : (
              <div className="h-full flex items-center justify-center p-4 bg-rene-aqua/30">
                <p className="text-gray-500 text-sm text-center">
                  Completá la nota clínica y asegurate de tener transcripción para ver la evidencia enlazada.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
