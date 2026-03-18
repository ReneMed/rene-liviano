"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LinkedEvidenceContent } from "./LinkedEvidenceContent";

export function LinkedEvidenceViewer() {
  const searchParams = useSearchParams();
  const visitId = searchParams.get("visitId");
  const [visit, setVisit] = useState<{
    soap: { subjective: string; objective: string; assessment: string; plan: string };
    transcript: { segments: Array<{ speaker: string; timestampStart: number; timestampEnd: number; text: string }> };
  } | null>(null);

  useEffect(() => {
    if (!visitId) return;
    fetch(`/api/visits/${visitId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.soap && data.transcript) {
          setVisit({
            soap: data.soap,
            transcript: data.transcript,
          });
        }
      })
      .catch(() => {});
  }, [visitId]);

  if (!visitId) {
    return (
      <div className="min-h-full flex items-center justify-center py-20" style={{ backgroundColor: "#f0fdfa" }}>
        <p className="text-gray-500">Seleccioná una consulta desde el dashboard.</p>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="min-h-full flex items-center justify-center py-20" style={{ backgroundColor: "#f0fdfa" }}>
        <p className="text-gray-500">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col" style={{ backgroundColor: "#f0fdfa" }}>
      <header className="p-4 border-b border-rene-aquaDark/60 bg-white flex items-center justify-between shrink-0">
        <a href={`/dashboard?visitId=${visitId}`} className="text-rene-green hover:underline font-medium">
          ← Volver al dashboard
        </a>
        <h1 className="font-semibold text-gray-800">Evidencia enlazada</h1>
      </header>

      <div className="flex-1 overflow-hidden min-h-0">
        <LinkedEvidenceContent soap={visit.soap} transcript={visit.transcript} />
      </div>
    </div>
  );
}
