"use client";

import type { ComplementaryAnalysisReadingEntry } from "@shared-types";
import { SOAPEditor } from "./SOAPEditor";
import { LinkedEvidenceContent } from "@/features/linked-evidence/LinkedEvidenceContent";
import { useNotesLeftPanel } from "./hooks/useNotesLeftPanel";

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
  extractedStudies?: Array<{
    type: string;
    description: string;
  }>;
  /** Textos detallados desde el modal de estudios complementarios (IA). */
  analysisReadings?: ComplementaryAnalysisReadingEntry[];
  /** Procesamiento en curso (esqueleto / hints en el editor SOAP). */
  isProcessing?: boolean;
  processingStage?: "idle" | "uploading" | "transcribing" | "generating" | "finalizing" | "error";
}

function speakerLabel(speaker: string): string {
  const s = speaker.toLowerCase();
  if (s === "medico" || s === "médico") return "Médico";
  if (s === "paciente") return "Paciente";
  return speaker;
}

export function NotesLeftPanel({
  soap,
  onSoapChange,
  onSave,
  transcript,
  extractedStudies = [],
  analysisReadings = [],
  isProcessing = false,
  processingStage = "idle",
}: NotesLeftPanelProps) {
  const {
    tabs,
    activeTab,
    setActiveTab,
    hasTranscript,
    canShowEvidence,
    hasMedicalOrders,
    hasAnalysisReadings,
    hasLecturaContent,
    studiesWithTypeLabel,
  } = useNotesLeftPanel({ soap, transcript, extractedStudies, analysisReadings });

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border border-rene-aquaDark/40 rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-x-1 border-b border-rene-aquaDark/40 shrink-0">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center justify-center min-h-11 h-11 px-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition box-border ${
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
            <SOAPEditor
              soap={soap}
              onChange={onSoapChange}
              onSave={onSave}
              pendingGeneration={isProcessing}
              processingStage={processingStage}
            />
          </div>
        )}
        {activeTab === "transcripcion" && (
          <div className="h-full overflow-auto p-4 bg-rene-aqua/50">
            {hasTranscript ? (
              <div className="text-sm text-gray-700 space-y-1">
                {transcript!.segments.map((s, i) => (
                  <p key={i}>
                    <span className="font-medium text-gray-500">{speakerLabel(s.speaker)}:</span>{" "}
                    {s.text}
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
        {activeTab === "lectura_estudios" && (
          <div className="h-full overflow-auto p-4 bg-rene-aqua/30 space-y-6">
            {hasAnalysisReadings && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-rene-greenDark mb-2">
                  Análisis incorporados
                </h3>
                <div className="space-y-4">
                  {analysisReadings.map((r) => (
                    <article
                      key={r.id}
                      className="rounded-lg border border-rene-aquaDark/40 bg-white p-3 shadow-sm"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 pb-2 mb-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {r.title?.trim() || "Análisis complementario"}
                        </p>
                        <time
                          className="text-[11px] text-gray-500 tabular-nums"
                          dateTime={r.createdAt}
                        >
                          {new Date(r.createdAt).toLocaleString("es-AR")}
                        </time>
                      </div>
                      <pre className="text-xs text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {r.content}
                      </pre>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {hasMedicalOrders && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-rene-greenDark mb-2">
                  Órdenes / estudios detectados
                </h3>
                <div className="space-y-3">
                  {studiesWithTypeLabel.map((order) => {
                    return (
                      <article
                        key={order.key}
                        className="rounded-lg border border-rene-aquaDark/40 bg-white p-3"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {order.typeLabel}
                        </p>
                        <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
                          {order.description}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {!hasLecturaContent && (
              <p className="text-gray-500 text-sm">
                No hay lecturas de análisis ni órdenes cargadas para esta consulta. Podés incorporar un
                análisis desde el grabador (estudios complementarios) con «Agregar a la consulta».
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
