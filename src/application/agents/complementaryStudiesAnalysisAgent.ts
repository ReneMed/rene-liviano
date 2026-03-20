import type {
  ComplementaryStudiesAnalysisResult,
  UploadedComplementaryStudyInput,
} from "@shared-types";
import { analyzeWithOpenAiStudy } from "@/infrastructure/study-analysis";
import {
  evaluateComplementaryStudiesAnalysisRule,
  isUsableComplementaryUpload,
  routeComplementaryStudy,
} from "./complementaryStudiesRouting";

/**
 * Agente **distinto** de `StudiesAgent`: no extrae órdenes del audio.
 * Analiza material complementario cargado por el médico (MVP: motor OpenAI; MedGemma en imágenes después).
 */
export async function runComplementaryStudiesAnalysisAgent(
  uploads: UploadedComplementaryStudyInput[]
): Promise<ComplementaryStudiesAnalysisResult> {
  const activation = evaluateComplementaryStudiesAnalysisRule(uploads);
  if (!activation.activated) {
    return { items: [] };
  }

  const usable = uploads.filter(isUsableComplementaryUpload);
  const items = await Promise.all(
    usable.map(async (input) => {
      const routing = routeComplementaryStudy(input);
      const analysis = await analyzeWithOpenAiStudy(input, routing);
      return {
        studyId: input.id,
        kind: routing.kind,
        engine: routing.engine,
        routingReason: `${routing.reason} (${routing.matchedRule ?? "sin regla"})`,
        analysis,
      };
    })
  );

  return { items };
}
