import type { ComplementaryLabValueStatus } from "@shared-types";
import type { ComplementaryResultViewModel } from "./complementaryStudyResultView";

function statusLabel(status: ComplementaryLabValueStatus): string {
  const map: Record<ComplementaryLabValueStatus, string> = {
    normal: "Normal",
    bajo: "Bajo",
    elevado: "Elevado",
    indeterminado: "Indeterminado (N/D)",
  };
  return map[status];
}

/**
 * Texto detallado para la pestaña «Lectura de análisis» (no va al bloque SOAP).
 */
export function formatComplementaryResultForConsultationText(
  vm: ComplementaryResultViewModel,
  opts: { title: string; contextSnippet?: string }
): string {
  const lines: string[] = [];
  lines.push(`## ${opts.title.trim()}`);
  lines.push("");
  lines.push(`_Incorporado el ${new Date().toLocaleString("es-AR")}_`);
  if (opts.contextSnippet?.trim()) {
    lines.push("");
    lines.push(`Contexto clínico (modal): ${opts.contextSnippet.trim()}`);
  }
  lines.push("");

  if (vm.labValues?.length) {
    lines.push("### Resultados");
    lines.push("");
    for (const row of vm.labValues) {
      const ref = row.reference ? ` | Ref.: ${row.reference}` : "";
      lines.push(
        `- **${row.name}**: ${row.value}${ref} → Estado: **${statusLabel(row.status)}**`
      );
    }
    lines.push("");
  }

  if (vm.clinicalInterpretation?.trim()) {
    lines.push("### Interpretación (alteraciones)");
    lines.push("");
    lines.push(vm.clinicalInterpretation.trim());
    lines.push("");
  }

  const summary = vm.summaryPoints.filter((s) => s.trim() && s !== "—");
  if (summary.length) {
    lines.push("### Resumen");
    lines.push("");
    for (const p of summary) {
      lines.push(`- ${p}`);
    }
    lines.push("");
  }

  const lim = vm.limitationsPoints.filter((s) => s.trim() && s !== "—");
  if (lim.length) {
    lines.push("### Limitaciones");
    lines.push("");
    for (const p of lim) {
      lines.push(`- ${p}`);
    }
    lines.push("");
  }

  if (vm.extraRows.length) {
    lines.push("### Datos adicionales");
    lines.push("");
    for (const r of vm.extraRows) {
      lines.push(`- **${r.label}**: ${r.value}`);
    }
  }

  return lines.join("\n").trim();
}
