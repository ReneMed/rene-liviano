import { sanitizeExtractedActions, type ExtractedActions, type VisitDetail } from "@shared-types";

interface VisitDetailLike extends Omit<VisitDetail, "extractedActions"> {
  extractedActions?: Partial<ExtractedActions>;
  agentAudit?: Array<{
    agentKey:
      | "soap"
      | "medication"
      | "studies"
      | "documents"
      | "followups"
      | "complementary_studies_analysis";
    activated: boolean;
    reason: string;
    matchedPattern?: string;
    source: "transcript_soap" | "uploaded_materials";
  }>;
}

function normalizeExtractedActions(source?: Partial<ExtractedActions>): ExtractedActions {
  return sanitizeExtractedActions(source);
}

/**
 * Normaliza el contrato de detalle de visita para que la UI
 * siempre consuma una forma estable sin null/undefined inesperados.
 */
export function normalizeVisitDetail<T extends VisitDetailLike>(visit: T): T {
  return {
    ...visit,
    extractedActions: normalizeExtractedActions(visit.extractedActions),
    agentAudit: visit.agentAudit ?? [],
    analysisReadings: Array.isArray(visit.analysisReadings) ? visit.analysisReadings : [],
  };
}
