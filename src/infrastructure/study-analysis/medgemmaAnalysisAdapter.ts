import type {
  ComplementaryStudyAnalysisItem,
  ComplementaryStudyRoutingDecision,
  UploadedComplementaryStudyInput,
} from "@shared-types";

/**
 * Adaptador MedGemma — sin llamadas HTTP hasta acuerdo/ops.
 * Contrato estable para conectar el motor real después.
 */
export async function analyzeWithMedGemma(
  _input: UploadedComplementaryStudyInput,
  routing: ComplementaryStudyRoutingDecision
): Promise<ComplementaryStudyAnalysisItem["analysis"]> {
  return {
    summary:
      "Análisis con MedGemma no ejecutado: integración pendiente (sin tráfico de red en esta build).",
    limitations:
      "No utilizar como diagnóstico definitivo. Habilitar motor y revisión clínica antes de producción.",
    structuredNotes: {
      engine: "medgemma",
      routedKind: routing.kind,
      studyId: routing.studyId,
    },
  };
}
