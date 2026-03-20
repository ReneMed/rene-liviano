"use client";

import { useCallback, useState } from "react";
import type { ComplementaryLabValueRow } from "@shared-types";
import type { PatientOption } from "../../types";
import { formatComplementaryResultForConsultationText } from "./formatComplementaryReadingText";
import {
  HUB_CARDS,
  STUDY_OPTIONS,
  buildProbeForRouting,
  patientSubtitle,
  type ComplementaryHubKind,
} from "./complementaryStudiesConstants";
import { readFileAsBase64 } from "../../utils/fileToBase64";
import {
  buildResultViewModel,
  ComplementaryStudyResultView,
  type ComplementaryResultViewModel,
} from "./complementaryStudyResultView";

export type { ComplementaryHubKind };

interface ComplementaryStudiesFlowProps {
  open: boolean;
  onClose: () => void;
  visitId: string | null;
  visitLoading: boolean;
  patient: PatientOption | null;
  /** Tras guardar en BD, p. ej. recargar detalle de visita en el store */
  onAddedToConsultation?: () => void;
}

export function ComplementaryStudiesFlow({
  open,
  onClose,
  visitId,
  visitLoading,
  patient,
  onAddedToConsultation,
}: ComplementaryStudiesFlowProps) {
  const [step, setStep] = useState<"hub" | "detail">("hub");
  const [kind, setKind] = useState<ComplementaryHubKind | null>(null);
  const [studyType, setStudyType] = useState("");
  const [context, setContext] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [resultView, setResultView] = useState<ComplementaryResultViewModel | null>(null);
  const [addToConsultPending, setAddToConsultPending] = useState(false);
  const [addToConsultDone, setAddToConsultDone] = useState(false);
  const [addToConsultError, setAddToConsultError] = useState<string | null>(null);

  const resetDetail = useCallback(() => {
    setStudyType("");
    setContext("");
    setFile(null);
    setErrorText(null);
    setResultView(null);
    setAddToConsultDone(false);
    setAddToConsultError(null);
  }, []);

  const handleClose = () => {
    setStep("hub");
    setKind(null);
    resetDetail();
    onClose();
  };

  const openDetail = (k: ComplementaryHubKind) => {
    setKind(k);
    setStep("detail");
    setContext("");
    setFile(null);
    setErrorText(null);
    setResultView(null);
    setAddToConsultDone(false);
    setAddToConsultError(null);
    setStudyType(STUDY_OPTIONS[k][0] ?? "");
  };

  const handleAnalyze = async () => {
    if (!visitId) {
      setErrorText("No hay visita activa. Esperá a que se cree la sesión o seleccioná paciente de nuevo.");
      return;
    }
    const routingHint = buildProbeForRouting(kind!, studyType, context);
    const textPreview = [
      routingHint,
      context.trim() ? `Contexto clínico:\n${context.trim()}` : "",
      `Tipo seleccionado: ${studyType}`,
      file ? `[Archivo: ${file.name}, ${file.type}]` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!file && textPreview.trim().length < 20) {
      setErrorText("Agregá un archivo (JPG, PNG o PDF) o un contexto clínico más largo.");
      return;
    }

    setSubmitting(true);
    setErrorText(null);
    setResultView(null);
    setAddToConsultDone(false);
    setAddToConsultError(null);
    try {
      const id = crypto.randomUUID();
      const mimeType = file?.type ?? "text/plain";
      const fileName = file?.name ?? `${kind}-contexto.txt`;

      let fileBase64: string | undefined;
      if (file) {
        try {
          fileBase64 = await readFileAsBase64(file);
        } catch (readErr) {
          throw new Error(readErr instanceof Error ? readErr.message : "No se pudo leer el archivo");
        }
      }

      const res = await fetch(`/api/visits/${visitId}/complementary-studies/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploads: [
            {
              id,
              mimeType,
              fileName,
              textPreview: textPreview.length > 20000 ? textPreview.slice(0, 20000) : textPreview,
              ...(fileBase64 ? { fileBase64 } : {}),
            },
          ],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        result?: {
          items?: Array<{
            analysis?: {
              summary?: string;
              limitations?: string;
              summaryPoints?: string[];
              limitationsPoints?: string[];
              structuredNotes?: Record<string, string>;
              labValues?: ComplementaryLabValueRow[];
              clinicalInterpretation?: string;
            };
          }>;
        };
      };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Error al analizar");
      }
      const first = data.result?.items?.[0]?.analysis;
      const vm = first ? buildResultViewModel(first) : null;
      if (vm) {
        setResultView(vm);
        setErrorText(null);
      } else {
        setResultView(null);
        setErrorText(
          "Análisis sin datos mostrables. Probá con otra imagen o más contexto clínico."
        );
      }
    } catch (e) {
      setResultView(null);
      setErrorText(e instanceof Error ? e.message : "Error al analizar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToConsultation = async () => {
    if (!visitId || !resultView || !kind) return;
    setAddToConsultPending(true);
    setAddToConsultError(null);
    try {
      const hubTitle = HUB_CARDS.find((c) => c.kind === kind)?.title ?? "Análisis complementario";
      const title = `${hubTitle} — ${studyType}`;
      const content = formatComplementaryResultForConsultationText(resultView, {
        title,
        contextSnippet: context.trim() || undefined,
      });
      const res = await fetch(`/api/visits/${visitId}/complementary-readings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "No se pudo guardar");
      }
      setAddToConsultDone(true);
      onAddedToConsultation?.();
    } catch (e) {
      setAddToConsultError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setAddToConsultPending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comp-studies-title"
      >
        {step === "hub" && (
          <>
            <header className="rounded-t-2xl bg-teal-600 px-5 py-4 text-white relative">
              <button
                type="button"
                className="absolute right-3 top-3 rounded-full p-1 hover:bg-white/20"
                onClick={handleClose}
                aria-label="Cerrar"
              >
                ✕
              </button>
              <h2 id="comp-studies-title" className="text-lg font-semibold pr-8">
                Análisis Especializados con IA
              </h2>
              <p className="text-sm text-teal-100 mt-1">{patientSubtitle(patient)}</p>
              {visitLoading && (
                <p className="text-xs text-teal-200 mt-1">Preparando sesión de visita…</p>
              )}
            </header>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HUB_CARDS.map((c) => (
                <button
                  key={c.kind}
                  type="button"
                  onClick={() => openDetail(c.kind)}
                  className="text-left rounded-xl border border-gray-200 p-4 hover:border-teal-400 hover:shadow-md transition bg-white"
                >
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <div className="font-semibold text-gray-900 text-sm">{c.title}</div>
                  <p className="text-xs text-gray-600 mt-1">{c.description}</p>
                  <ul className="mt-2 text-xs text-teal-700 space-y-0.5">
                    {c.bullets.map((b) => (
                      <li key={b}>• {b}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </>
        )}

        {step === "detail" && kind && (
          <>
            <header className="rounded-t-2xl bg-teal-600 px-5 py-4 text-white relative">
              <button
                type="button"
                className="absolute right-3 top-3 rounded-full p-1 hover:bg-white/20"
                onClick={handleClose}
                aria-label="Cerrar"
              >
                ✕
              </button>
              <h2 className="text-lg font-semibold pr-8">
                {HUB_CARDS.find((c) => c.kind === kind)?.icon}{" "}
                {HUB_CARDS.find((c) => c.kind === kind)?.title}
              </h2>
              <p className="text-sm text-teal-100 mt-1">{patientSubtitle(patient)}</p>
            </header>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-teal-800 mb-1">Título de estudio</label>
                <select
                  value={studyType}
                  onChange={(e) => setStudyType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {STUDY_OPTIONS[kind].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-800 mb-1">
                  Archivo (JPG, PNG o PDF) — opcional si el contexto es suficiente
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                />
                {file && (
                  <p className="text-xs text-gray-600 mt-1">
                    {file.name}{" "}
                    <button
                      type="button"
                      className="text-red-600 underline"
                      onClick={() => setFile(null)}
                    >
                      Quitar
                    </button>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-800 mb-1">
                  Contexto clínico (opcional)
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={4}
                  placeholder="Ej: control de rutina, antecedentes, síntomas actuales…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              {submitting && (
                <div className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-2 text-sm text-teal-900">
                  Analizando con IA…
                </div>
              )}
              {resultView && <ComplementaryStudyResultView result={resultView} />}
              {errorText && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {errorText}
                </p>
              )}
            </div>
            <div className="px-4 pb-4 space-y-3">
              {resultView && (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={addToConsultPending || addToConsultDone || !visitId}
                    onClick={() => void handleAddToConsultation()}
                    className="w-full rounded-xl bg-emerald-600 text-white py-2.5 text-sm font-medium disabled:opacity-50 shadow-sm"
                  >
                    {addToConsultPending
                      ? "Guardando…"
                      : addToConsultDone
                        ? "Agregado a la consulta"
                        : "Agregar a la consulta"}
                  </button>
                  {addToConsultDone && (
                    <p className="text-xs text-center text-emerald-800">
                      En el panel de la consulta, abrí la pestaña «Lectura de análisis» para ver el detalle.
                    </p>
                  )}
                  {addToConsultError && (
                    <p className="text-xs text-center text-red-600">{addToConsultError}</p>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("hub");
                    setKind(null);
                    resetDetail();
                  }}
                  className="flex-1 rounded-xl border border-gray-300 py-2 text-sm"
                >
                  Volver
                </button>
                <button
                  type="button"
                  disabled={submitting || visitLoading || !visitId}
                  onClick={() => void handleAnalyze()}
                  className="flex-1 rounded-xl bg-teal-600 text-white py-2 text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? "Analizando…" : "Analizar"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
