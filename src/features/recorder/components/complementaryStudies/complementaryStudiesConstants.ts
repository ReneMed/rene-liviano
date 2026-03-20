import type { PatientOption } from "../../types";

export type ComplementaryHubKind = "laboratory" | "dermatology_image" | "cardiac" | "general_medical_image";

export const HUB_CARDS: Array<{
  kind: ComplementaryHubKind;
  title: string;
  description: string;
  bullets: string[];
  icon: string;
}> = [
  {
    kind: "laboratory",
    title: "Análisis de Laboratorio",
    description: "Interpretación de estudios de sangre, orina y bioquímica.",
    bullets: ["Valores y rangos", "Hallazgos relevantes", "Recomendaciones"],
    icon: "🧪",
  },
  {
    kind: "dermatology_image",
    title: "Análisis Dermatológico",
    description: "Evaluación de lesiones cutáneas con criterios clínicos.",
    bullets: ["Descripción de lesión", "Criterios ABCDE", "Orientación"],
    icon: "📷",
  },
  {
    kind: "cardiac",
    title: "Análisis Cardiológico",
    description: "ECG y estudios cardiovasculares.",
    bullets: ["Ritmo y eje", "Hallazgos", "Seguimiento sugerido"],
    icon: "❤️",
  },
  {
    kind: "general_medical_image",
    title: "Análisis de Imágenes",
    description: "Radiografías, tomografías, resonancias.",
    bullets: ["Descripción estructurada", "Hallazgos", "Correlación clínica"],
    icon: "🔬",
  },
];

export const STUDY_OPTIONS: Record<ComplementaryHubKind, string[]> = {
  laboratory: [
    "Hemograma completo",
    "Perfil lipídico",
    "Bioquímica / función hepática",
    "Orina completa",
    "Glucemia / HbA1c",
    "Otro",
  ],
  dermatology_image: ["Lesión única", "Múltiples lesiones", "Control evolutivo", "Otro"],
  cardiac: ["ECG de reposo", "Holter", "Ecocardiograma", "Prueba de esfuerzo", "Otro"],
  general_medical_image: ["Radiografía", "Tomografía", "Resonancia magnética", "Ecografía", "Otro"],
};

export function patientSubtitle(p: PatientOption | null): string {
  if (!p) return "Paciente: No especificado · DNI: No especificado";
  const doc = p.document ? `DNI: ${p.document}` : "DNI: No especificado";
  return `Paciente: ${p.name} · ${doc}`;
}

export function buildProbeForRouting(
  kind: ComplementaryHubKind,
  studyType: string,
  context: string
): string {
  const base = `${studyType} ${context}`;
  switch (kind) {
    case "laboratory":
      return `laboratorio hemograma ${base}`;
    case "dermatology_image":
      return `dermatología piel lesión cutánea ${base}`;
    case "cardiac":
      return `ecg electrocardiograma cardiológico ${base}`;
    case "general_medical_image":
      return `radiografía tomografía resonancia imagen médica ${base}`;
    default:
      return base;
  }
}
