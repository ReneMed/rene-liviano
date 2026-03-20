"use client";

import type {
  ComplementaryLabValueRow,
  ComplementaryLabValueStatus,
} from "@shared-types";

const NOTE_LABELS: Record<string, string> = {
  hallazgos_relevantes: "Hallazgos",
  valores_alterados: "Valores alterados",
  sugerencias_seguimiento: "Seguimiento",
  impresion: "Impresión",
  alertas: "Alertas",
  descripcion: "Descripción",
  riesgo_orientativo: "Riesgo orientativo",
  hallazgos: "Hallazgos imagen",
  correlacion_clinica_sugerida: "Correlación clínica",
};

function labelForKey(k: string): string {
  return NOTE_LABELS[k] ?? k.replace(/_/g, " ");
}

function StatusBadge({ status }: { status: ComplementaryLabValueStatus }) {
  const map: Record<
    ComplementaryLabValueStatus,
    { label: string; className: string }
  > = {
    normal: {
      label: "Normal",
      className: "bg-emerald-100 text-emerald-900 border border-emerald-200",
    },
    bajo: {
      label: "Bajo",
      className: "bg-sky-100 text-sky-900 border border-sky-200",
    },
    elevado: {
      label: "Elevado",
      className: "bg-orange-100 text-orange-900 border border-orange-200",
    },
    indeterminado: {
      label: "N/D",
      className: "bg-gray-100 text-gray-700 border border-gray-200",
    },
  };
  const c = map[status];
  return (
    <span
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${c.className}`}
    >
      {c.label}
    </span>
  );
}

export interface ComplementaryResultViewModel {
  summaryPoints: string[];
  limitationsPoints: string[];
  extraRows: Array<{ label: string; value: string }>;
  labValues?: ComplementaryLabValueRow[];
  clinicalInterpretation?: string;
}

export function ComplementaryStudyResultView({ result }: { result: ComplementaryResultViewModel }) {
  const hasLab = (result.labValues?.length ?? 0) > 0;
  const showSummaryBullets = result.summaryPoints.some((s) => s.trim() && s !== "—");

  return (
    <div className="space-y-4 text-sm border border-teal-100 rounded-xl p-3 bg-teal-50/40">
      {hasLab && (
        <section>
          <h3 className="font-semibold text-teal-900 text-xs uppercase tracking-wide mb-2">
            Resultados
          </h3>
          <div className="overflow-x-auto rounded-lg border border-teal-100 bg-white">
            <table className="w-full text-xs min-w-[280px]">
              <thead>
                <tr className="bg-teal-600/10 text-left text-teal-900">
                  <th className="p-2 font-semibold">Parámetro</th>
                  <th className="p-2 font-semibold">Valor</th>
                  <th className="p-2 font-semibold hidden sm:table-cell">Ref.</th>
                  <th className="p-2 font-semibold text-right w-[1%]">Estado</th>
                </tr>
              </thead>
              <tbody>
                {result.labValues!.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="p-2 align-top text-gray-900 font-medium">{row.name}</td>
                    <td className="p-2 align-top text-gray-800">{row.value}</td>
                    <td className="p-2 align-top text-gray-600 hidden sm:table-cell">
                      {row.reference ?? "—"}
                    </td>
                    <td className="p-2 align-middle text-right">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-500 mt-1 sm:hidden">
            Deslizá horizontalmente si no ves la referencia.
          </p>
        </section>
      )}

      {result.clinicalInterpretation && (
        <section className={hasLab ? "border-t border-teal-100 pt-3" : ""}>
          <h3 className="font-semibold text-teal-900 text-xs uppercase tracking-wide mb-2">
            Interpretación (alteraciones)
          </h3>
          <p className="text-gray-800 leading-relaxed text-xs">{result.clinicalInterpretation}</p>
        </section>
      )}

      {showSummaryBullets && (
        <section className="border-t border-teal-100 pt-3">
          <h3 className="font-semibold text-teal-900 text-xs uppercase tracking-wide mb-2">Resumen</h3>
          <ul className="list-none space-y-1.5 text-gray-900">
            {result.summaryPoints
              .filter((s) => s.trim() && s !== "—")
              .map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-teal-600 font-bold shrink-0">•</span>
                  <span>{line}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="border-t border-teal-100 pt-3">
        <h3 className="font-semibold text-amber-900/90 text-xs uppercase tracking-wide mb-2">
          Limitaciones
        </h3>
        <ul className="list-none space-y-1 text-gray-700">
          {result.limitationsPoints.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-amber-600 shrink-0">⚠</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {result.extraRows.length > 0 && (
        <section className="border-t border-teal-100 pt-3">
          <h3 className="font-semibold text-teal-900 text-xs uppercase tracking-wide mb-2">Datos</h3>
          <dl className="space-y-2">
            {result.extraRows.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-1 sm:grid-cols-[minmax(0,7rem)_1fr] gap-x-2 gap-y-0.5 text-xs"
              >
                <dt className="font-medium text-teal-800 shrink-0">{row.label}</dt>
                <dd className="text-gray-800 break-words">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

export function buildResultViewModel(analysis: {
  summary?: string;
  limitations?: string;
  summaryPoints?: string[];
  limitationsPoints?: string[];
  structuredNotes?: Record<string, string>;
  labValues?: ComplementaryLabValueRow[];
  clinicalInterpretation?: string;
}): ComplementaryResultViewModel | null {
  const internal = new Set(["engine", "model", "routedKind", "studyId"]);
  const skipExtraWhenLab = new Set(["valores_alterados", "hallazgos_relevantes"]);

  let summaryPoints =
    analysis.summaryPoints?.filter((s) => typeof s === "string" && s.trim()) ?? [];
  if (!summaryPoints.length && analysis.summary?.trim()) {
    const raw = analysis.summary.trim();
    if (raw === "Valores detallados en la tabla.") {
      summaryPoints = [];
    } else {
      const lines = raw
        .split(/\n+/)
        .map((s) => s.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean);
      summaryPoints = lines.length ? lines : [raw];
    }
  }

  let limitationsPoints =
    analysis.limitationsPoints?.filter((s) => typeof s === "string" && s.trim()) ?? [];
  if (!limitationsPoints.length && analysis.limitations?.trim()) {
    const raw = analysis.limitations.trim();
    const lines = raw
      .split(/\n+/)
      .map((s) => s.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
    limitationsPoints = lines.length ? lines : [raw];
  }

  const hasLab = (analysis.labValues?.length ?? 0) > 0;

  if (!summaryPoints.length && !limitationsPoints.length && !hasLab && !analysis.clinicalInterpretation) {
    return null;
  }

  const filterExtraKey = (k: string) => {
    if (internal.has(k)) return false;
    if (hasLab && skipExtraWhenLab.has(k)) return false;
    return true;
  };

  const extraRows =
    analysis.structuredNotes &&
    Object.entries(analysis.structuredNotes)
      .filter(([k]) => filterExtraKey(k))
      .map(([k, v]) => ({
        label: labelForKey(k),
        value: String(v).trim(),
      }))
      .filter((r) => r.value.length > 0);

  return {
    summaryPoints: summaryPoints.length ? summaryPoints : [],
    limitationsPoints: limitationsPoints.length ? limitationsPoints : ["—"],
    extraRows: extraRows ?? [],
    labValues: analysis.labValues,
    clinicalInterpretation: analysis.clinicalInterpretation?.trim() || undefined,
  };
}
