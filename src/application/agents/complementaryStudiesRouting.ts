import type {
  AgentActivationDecision,
  ComplementaryStudyAnalysisEngine,
  ComplementaryStudyKind,
  ComplementaryStudyRoutingDecision,
  UploadedComplementaryStudyInput,
} from "@shared-types";

function normalizeText(s: string): string {
  return s.trim().toLowerCase();
}

/** Texto unificado para reglas (nombre + OCR / texto extraído) */
export function buildComplementaryStudyProbe(input: UploadedComplementaryStudyInput): string {
  const name = input.fileName ?? "";
  const text = input.textPreview ?? "";
  return normalizeText(`${name} ${text}`);
}

const LAB_HINTS =
  /(hemograma|glucemia|urea|creatinina|perfil\s+lip[ií]dico|laboratorio|bioqu[ií]mica|orina\s+completa|colesterol|triglic[eé]ridos|funci[oó]n\s+hep[aá]tica|t4|tsh|hba1c)/i;
const CARDIAC_HINTS =
  /(ecg|electrocardiograma|ekg|holter|ecocardiograma|ecocardio|stress\s+test|prueba\s+de\s+esfuerzo|ergometr[ií]a|\bmapa\b|monitoreo\s+ambulatorio)/i;
const DERMA_HINTS = /(dermatolog|dermatoscop|piel|cut[aá]neo|melanoma|lunares|lesi[oó]n\s+cut[aá]nea)/i;

const IMAGE_MIME = /^image\//i;
const PDF_MIME = /application\/pdf/i;

export function isUsableComplementaryUpload(u: UploadedComplementaryStudyInput): boolean {
  const mime = u.mimeType.toLowerCase();
  if (IMAGE_MIME.test(mime) || PDF_MIME.test(mime)) return true;
  return (u.textPreview ?? "").trim().length >= 20;
}

/**
 * Activa el agente solo si hay material cargado y con señal mínima para clasificar.
 * No analiza contenido clínico aquí: solo elegibilidad.
 */
export function evaluateComplementaryStudiesAnalysisRule(
  uploads: UploadedComplementaryStudyInput[]
): AgentActivationDecision {
  if (!uploads.length) {
    return {
      agentKey: "complementary_studies_analysis",
      activated: false,
      reason: "No hay estudios complementarios cargados",
      source: "uploaded_materials",
    };
  }

  const usable = uploads.filter(isUsableComplementaryUpload);
  if (!usable.length) {
    return {
      agentKey: "complementary_studies_analysis",
      activated: false,
      reason: "Archivos sin tipo soportado o sin texto mínimo para clasificar",
      source: "uploaded_materials",
    };
  }

  return {
    agentKey: "complementary_studies_analysis",
    activated: true,
    reason: "Hay material complementario elegible para clasificación y análisis",
    matchedPattern: `${usable.length} archivo(s)`,
    source: "uploaded_materials",
  };
}

function pickEngineAndKind(
  probe: string,
  mime: string
): { kind: ComplementaryStudyKind; engine: ComplementaryStudyAnalysisEngine; reason: string; matchedRule: string } {
  const isImage = IMAGE_MIME.test(mime);

  // 1) Dermatología en imagen → OpenAI (política actual del producto)
  if (isImage && DERMA_HINTS.test(probe)) {
    return {
      kind: "dermatology_image",
      engine: "openai",
      reason: "Imagen con indicios dermatológicos: motor OpenAI (política actual)",
      matchedRule: "dermatology_image→openai",
    };
  }

  // 2) Cardiológico (cualquier soporte con texto/nombre útil)
  if (CARDIAC_HINTS.test(probe)) {
    return {
      kind: "cardiac",
      engine: "openai",
      reason: "Patrones cardiológicos en nombre o texto: motor OpenAI (política actual)",
      matchedRule: "cardiac→openai",
    };
  }

  // 3) Laboratorio
  if (LAB_HINTS.test(probe)) {
    return {
      kind: "laboratory",
      engine: "openai",
      reason: "Patrones de laboratorio en texto/nombre: motor OpenAI (política actual)",
      matchedRule: "laboratory→openai",
    };
  }

  // 4) Imagen médica genérica — hoy todo pasa por GPT; MedGemma se integrará solo para este bucket
  if (isImage) {
    return {
      kind: "general_medical_image",
      engine: "openai",
      reason:
        "Imagen médica sin subtipo específico: motor OpenAI (MVP). MedGemma reservado para imágenes en fase siguiente",
      matchedRule: "general_medical_image→openai",
    };
  }

  // 5) PDF u otro con texto largo pero sin patrón
  if (PDF_MIME.test(mime) || probe.length >= 40) {
    return {
      kind: "unknown",
      engine: "openai",
      reason: "Documento sin patrón determinístico claro: fallback conservador a OpenAI",
      matchedRule: "unknown_fallback→openai",
    };
  }

  return {
    kind: "unknown",
    engine: "openai",
    reason: "Sin patrón suficiente: fallback OpenAI",
    matchedRule: "unknown_minimal→openai",
  };
}

/**
 * Clasificación determinística + enrutado a motor (auditable).
 * Política MVP: todo por OpenAI. MedGemma se cableará después para imágenes médicas genéricas.
 */
export function routeComplementaryStudy(input: UploadedComplementaryStudyInput): ComplementaryStudyRoutingDecision {
  const probe = buildComplementaryStudyProbe(input);
  const mime = input.mimeType.toLowerCase();
  const { kind, engine, reason, matchedRule } = pickEngineAndKind(probe, mime);
  return {
    studyId: input.id,
    kind,
    engine,
    reason,
    matchedRule,
  };
}
