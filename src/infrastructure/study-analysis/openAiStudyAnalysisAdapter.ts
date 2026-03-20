import OpenAI from "openai";
import type {
  ComplementaryLabValueRow,
  ComplementaryLabValueStatus,
  ComplementaryStudyAnalysisItem,
  ComplementaryStudyRoutingDecision,
  UploadedComplementaryStudyInput,
} from "@shared-types";
import { buildSystemPrompt, buildUserTextBlock } from "./complementaryStudiesOpenAiPrompts";

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY es requerido para análisis con IA");
  return new OpenAI({ apiKey: key });
}

function getModel(): string {
  return process.env.COMPLEMENTARY_STUDIES_OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

function isVisionMime(mime: string): boolean {
  return /^image\/(jpeg|png|webp|gif)$/i.test(mime);
}

function isPdfMime(mime: string): boolean {
  return /^application\/pdf$/i.test(mime);
}

interface ParsedAnalysisJson {
  summary?: string;
  limitations?: string;
  summaryPoints?: unknown;
  limitationsPoints?: unknown;
  structuredNotes?: Record<string, string>;
  labValues?: unknown;
  interpretacionAlteraciones?: string;
}

function normalizeLabStatus(raw: string | undefined): ComplementaryLabValueStatus {
  const s = (raw ?? "").toLowerCase().trim();
  if (!s) return "indeterminado";
  if (s === "normal" || s.includes("normal") || s === "ok") return "normal";
  if (["bajo", "low", "disminuido", "hipo", "below"].some((x) => s.includes(x))) return "bajo";
  if (["elevado", "alto", "high", "aumentado", "hiper", "above"].some((x) => s.includes(x)))
    return "elevado";
  return "indeterminado";
}

function parseLabValues(raw: unknown): ComplementaryLabValueRow[] {
  if (!Array.isArray(raw)) return [];
  const out: ComplementaryLabValueRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = String(o.nombre ?? o.name ?? "").trim();
    const value = String(o.valor ?? o.value ?? "").trim();
    if (!name && !value) continue;
    const refRaw = o.referencia ?? o.reference;
    const reference =
      refRaw != null && String(refRaw).trim() !== "" ? String(refRaw).trim() : undefined;
    const status = normalizeLabStatus(String(o.estado ?? o.status ?? ""));
    out.push({
      name: name || "Parámetro",
      value: value || "—",
      reference,
      status,
    });
  }
  return out.slice(0, 40);
}

function asStringArray(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

function joinPoints(points: string[]): string {
  return points.join("\n");
}

/**
 * Adaptador OpenAI (GPT) — análisis multimodal (imágenes) + texto (PDF/contexto).
 */
export async function analyzeWithOpenAiStudy(
  input: UploadedComplementaryStudyInput,
  routing: ComplementaryStudyRoutingDecision
): Promise<ComplementaryStudyAnalysisItem["analysis"]> {
  const openai = getOpenAI();
  const model = getModel();
  const system = buildSystemPrompt(routing.kind);

  const rawB64 = input.fileBase64?.trim();
  const hasB64 = !!rawB64;
  const vision = hasB64 && isVisionMime(input.mimeType);
  const pdf = hasB64 && isPdfMime(input.mimeType);

  const userText = buildUserTextBlock({
    fileName: input.fileName,
    mimeType: input.mimeType,
    textPreview: input.textPreview,
    hasImage: vision,
    hasPdf: pdf,
  });

  let userContent: OpenAI.ChatCompletionContentPart[] | string;

  if (vision && rawB64) {
    const dataUrl = `data:${input.mimeType};base64,${rawB64}`;
    userContent = [
      { type: "text", text: userText },
      { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
    ];
  } else {
    let extra = userText;
    if (pdf && rawB64) {
      extra += `\n\n[Nota: se recibió un PDF; el análisis se basa en el texto/contexto indicado. Para mejor lectura automática, subir captura o imagen del informe.]`;
    }
    userContent = extra;
  }

  const response = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    max_tokens: routing.kind === "laboratory" ? 2200 : 1800,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Respuesta vacía del modelo de análisis");
  }

  let parsed: ParsedAnalysisJson;
  try {
    parsed = JSON.parse(content) as ParsedAnalysisJson;
  } catch {
    throw new Error("El modelo no devolvió JSON válido");
  }

  let summaryPoints = asStringArray(parsed.summaryPoints, 8);
  let limitationsPoints = asStringArray(parsed.limitationsPoints, 6);

  if (!summaryPoints.length && typeof parsed.summary === "string" && parsed.summary.trim()) {
    summaryPoints = parsed.summary
      .split(/\n+/)
      .map((s) => s.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  if (!limitationsPoints.length && typeof parsed.limitations === "string" && parsed.limitations.trim()) {
    limitationsPoints = parsed.limitations
      .split(/\n+/)
      .map((s) => s.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  const structuredNotes: Record<string, string> = {
    ...(parsed.structuredNotes && typeof parsed.structuredNotes === "object"
      ? parsed.structuredNotes
      : {}),
    engine: "openai",
    model,
    routedKind: routing.kind,
    studyId: routing.studyId,
  };

  const labValues = parseLabValues(parsed.labValues);
  const clinicalInterpretation =
    typeof parsed.interpretacionAlteraciones === "string"
      ? parsed.interpretacionAlteraciones.trim()
      : undefined;

  const summaryText =
    summaryPoints.length > 0
      ? joinPoints(summaryPoints)
      : labValues.length > 0
        ? "Valores detallados en la tabla."
        : typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "No se generó un resumen interpretable. Verificá la calidad del archivo o el contexto.";

  const limitationsText =
    limitationsPoints.length > 0
      ? joinPoints(limitationsPoints)
      : typeof parsed.limitations === "string" && parsed.limitations.trim()
        ? parsed.limitations.trim()
        : "Herramienta de apoyo: revisar hallazgos con el criterio clínico.";

  return {
    summary: summaryText,
    limitations: limitationsText,
    structuredNotes,
    summaryPoints: summaryPoints.length ? summaryPoints : undefined,
    limitationsPoints: limitationsPoints.length ? limitationsPoints : undefined,
    labValues: labValues.length ? labValues : undefined,
    clinicalInterpretation: clinicalInterpretation || undefined,
  };
}
