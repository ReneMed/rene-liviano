import type { ComplementaryStudyKind } from "@shared-types";

const JSON_SHAPE_GENERIC = `{
  "summaryPoints": ["frase corta 1", "frase corta 2", ...],
  "limitationsPoints": ["advertencia breve 1", ...],
  "structuredNotes": { "clave_snake": "texto breve en una línea o dos" }
}`;

const JSON_SHAPE_LAB = `{
  "summaryPoints": ["opcional: 1-2 frases de cabecera muy cortas, o []"],
  "limitationsPoints": ["advertencias breves"],
  "labValues": [
    { "nombre": "Hemoglobina", "valor": "11,63 g/dL", "referencia": "13-17 g/dL", "estado": "bajo" }
  ],
  "interpretacionAlteraciones": "Texto breve (máx. ~500 caracteres): qué parámetros están alterados y posibles orientaciones clínicas (no diagnóstico definitivo).",
  "structuredNotes": {}
}`;

const BASE = `Sos un asistente clínico para médicos en Argentina. Español médico argentino.
FORMATO OBLIGATORIO — lectura rápida (sin párrafos largos):
- summaryPoints: array de frases MUY CORTAS (máx. ~120 caracteres cada una), o vacío si el detalle va en structuredNotes.
- limitationsPoints: 2 a 4 frases cortas sobre límites del análisis.
- structuredNotes: solo datos útiles en claves snake_case; valores breves.

REGLAS:
- No inventes valores que no se vean en el material.
- Si algo no se lee, decilo en limitationsPoints.
- Sin diagnóstico definitivo.

Respondé ÚNICAMENTE JSON válido (sin markdown) con esta forma exacta:
${JSON_SHAPE_GENERIC}`;

const LABORATORY_SYSTEM = `Sos un asistente clínico para médicos en Argentina. Español médico argentino.
Analizás resultados de laboratorio desde imagen o texto. Sin diagnóstico definitivo.

FORMATO LABORATORIO (obligatorio):
- labValues: un objeto por cada parámetro leído en el material:
  - nombre: ej. Hemoglobina, Leucocitos
  - valor: tal como figura (con unidad)
  - referencia: rango del informe o "—" si no hay
  - estado: SOLO una de: "normal" | "bajo" | "elevado" | "indeterminado" (compará valor vs referencia; si no podés: indeterminado)
- interpretacionAlteraciones: texto breve (máx. ~500 caracteres): qué está alterado y posibles orientaciones (no diagnóstico cerrado).
- limitationsPoints: 2-4 frases sobre límites (referencias faltantes, etc.).
- summaryPoints: [] o 1-2 frases muy cortas; no repitas labValues en prosa larga.
- structuredNotes: opcional, datos extra breves.

No inventes valores que no veas en el material.

Respondé ÚNICAMENTE JSON válido (sin markdown) con esta forma exacta:
${JSON_SHAPE_LAB}`;

export function buildSystemPrompt(kind: ComplementaryStudyKind): string {
  if (kind === "laboratory") {
    return LABORATORY_SYSTEM;
  }

  const kindHints: Record<Exclude<ComplementaryStudyKind, "laboratory">, string> = {
    cardiac: `Tipo: cardio/ECG. Ritmo, eje, hallazgos en ítems breves.`,
    dermatology_image: `Tipo: dermatología. Aspecto, localización, ABCDE en frases cortas.`,
    general_medical_image: `Tipo: imagen médica. Hallazgos visibles en viñetas, sin redacción narrativa.`,
    unknown: `Material mixto o poco claro. Sé explícito en limitationsPoints.`,
  };

  return `${BASE}\n\n${kindHints[kind as Exclude<ComplementaryStudyKind, "laboratory">]}`;
}

export function buildUserTextBlock(params: {
  fileName?: string;
  mimeType: string;
  textPreview?: string;
  hasImage: boolean;
  hasPdf: boolean;
}): string {
  const lines = [
    `Archivo: ${params.fileName ?? "(sin nombre)"}`,
    `MIME: ${params.mimeType}`,
    params.hasImage ? "Se adjunta imagen en base64 en el mensaje multimodal." : "",
    params.hasPdf
      ? "PDF: en esta versión el análisis se basa en el texto/contexto provisto; si no hay texto extraído, indicá que hace falta imagen o PDF con texto legible."
      : "",
    "",
    "Contexto y datos aportados por el médico:",
    params.textPreview?.trim() || "(sin texto adicional)",
  ];
  return lines.filter(Boolean).join("\n");
}
