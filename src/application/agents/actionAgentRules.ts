import type { SOAPNote, TranscriptSegment } from "@shared-types";
import type { AgentActivationDecision } from "@shared-types";

const NEGATIVE_PATTERNS = [
  /sin\s+medicaci[oó]n/i,
  /no\s+requiere\s+medicaci[oó]n/i,
  /sin\s+indicaci[oó]n\s+de\s+estudios/i,
  /no\s+se\s+solicitan\s+estudios/i,
  /sin\s+seguimiento/i,
  /sin\s+control/i,
  /sin\s+documentaci[oó]n/i,
  /no\s+requiere\s+certificado/i,
];

const MIN_CONFIDENCE_AVG = 0.65;
const MAX_LOW_CONFIDENCE_RATIO = 0.55;
const MIN_STUDIES_CONTEXT_WORDS = 4;
const MIN_DOCUMENT_CONTEXT_WORDS = 5;
const MIN_FOLLOWUP_CONTEXT_WORDS = 4;

function buildRuleText(segments: TranscriptSegment[], soap: SOAPNote, fields: Array<keyof SOAPNote>): string {
  const transcriptText = segments.map((s) => s.text).join(" ");
  const soapText = fields.map((field) => soap[field] ?? "").join(" ");
  return `${transcriptText} ${soapText}`.toLowerCase();
}

function buildMedicalSpeakerText(segments: TranscriptSegment[]): string {
  const medicalSegments = segments.filter((s) => s.speaker === "medico").map((s) => s.text);
  return medicalSegments.join(" ").toLowerCase();
}

function hasNegativeOverride(text: string): boolean {
  return NEGATIVE_PATTERNS.some((pattern) => pattern.test(text));
}

function estimateConfidence(segments: TranscriptSegment[]): { avg: number; lowRatio: number } {
  if (!segments.length) return { avg: 1, lowRatio: 0 };
  let confCount = 0;
  let confSum = 0;
  let lowCount = 0;
  for (const s of segments) {
    if (typeof s.confidence === "number") {
      confCount += 1;
      confSum += s.confidence;
    }
    if (s.lowConfidence) lowCount += 1;
  }
  const avg = confCount > 0 ? confSum / confCount : 1;
  const lowRatio = lowCount / segments.length;
  return { avg, lowRatio };
}

function tooLowConfidence(segments: TranscriptSegment[]): boolean {
  const { avg, lowRatio } = estimateConfidence(segments);
  return avg < MIN_CONFIDENCE_AVG || lowRatio > MAX_LOW_CONFIDENCE_RATIO;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function evaluateRule(
  text: string,
  regex: RegExp,
  agentKey: AgentActivationDecision["agentKey"]
): AgentActivationDecision {
  if (hasNegativeOverride(text)) {
    return {
      agentKey,
      activated: false,
      reason: "Regla negativa detectada en transcripción/SOAP",
      source: "transcript_soap",
    };
  }
  const match = text.match(regex);
  if (match) {
    return {
      agentKey,
      activated: true,
      reason: "Patrón determinístico activado",
      matchedPattern: match[0],
      source: "transcript_soap",
    };
  }
  return {
    agentKey,
    activated: false,
    reason: "No se detectaron patrones de activación",
    source: "transcript_soap",
  };
}

export function evaluateMedicationAgentRule(
  segments: TranscriptSegment[],
  soap: SOAPNote
): AgentActivationDecision {
  const text = buildRuleText(segments, soap, ["plan", "assessment"]);
  const doctorText = buildMedicalSpeakerText(segments);
  return evaluateRule(
    `${text} ${doctorText}`,
    /(indico|indicar|indicación|receta|medicación|medicacion|dosis|cada\s+\d+h|vo\b|tomar|mg\b|comprimido)/i,
    "medication"
  );
}

export function evaluateStudiesAgentRule(
  segments: TranscriptSegment[],
  soap: SOAPNote
): AgentActivationDecision {
  const text = buildRuleText(segments, soap, ["plan", "objective"]);
  const doctorText = buildMedicalSpeakerText(segments);
  if (tooLowConfidence(segments)) {
    return {
      agentKey: "studies",
      activated: false,
      reason: "Bloqueado por baja confianza de transcripción",
      source: "transcript_soap",
    };
  }
  const contextWords = wordCount(`${soap.plan} ${soap.objective}`);
  if (contextWords < MIN_STUDIES_CONTEXT_WORDS) {
    return {
      agentKey: "studies",
      activated: false,
      reason: "Bloqueado por contexto SOAP insuficiente",
      source: "transcript_soap",
    };
  }
  return evaluateRule(
    `${text} ${doctorText}`,
    /(laboratorio|hemograma|perfil|ecografía|ecografia|radiografía|radiografia|tomografía|tomografia|rmn|resonancia|interconsulta|derivación|derivacion|orden)/i,
    "studies"
  );
}

export function evaluateDocumentsAgentRule(
  segments: TranscriptSegment[],
  soap: SOAPNote
): AgentActivationDecision {
  const text = buildRuleText(segments, soap, ["plan"]);
  const doctorText = buildMedicalSpeakerText(segments);
  if (tooLowConfidence(segments)) {
    return {
      agentKey: "documents",
      activated: false,
      reason: "Bloqueado por baja confianza de transcripción",
      source: "transcript_soap",
    };
  }
  if (wordCount(soap.plan) < MIN_DOCUMENT_CONTEXT_WORDS) {
    return {
      agentKey: "documents",
      activated: false,
      reason: "Bloqueado por contexto SOAP insuficiente",
      source: "transcript_soap",
    };
  }
  return evaluateRule(
    `${text} ${doctorText}`,
    /(certificado|licencia|reposo|justificación|justificacion|consentimiento|epicrisis|informe|carta)/i,
    "documents"
  );
}

export function evaluateFollowupsAgentRule(
  segments: TranscriptSegment[],
  soap: SOAPNote
): AgentActivationDecision {
  const text = buildRuleText(segments, soap, ["plan"]);
  const doctorText = buildMedicalSpeakerText(segments);
  if (tooLowConfidence(segments)) {
    return {
      agentKey: "followups",
      activated: false,
      reason: "Bloqueado por baja confianza de transcripción",
      source: "transcript_soap",
    };
  }
  if (wordCount(soap.plan) < MIN_FOLLOWUP_CONTEXT_WORDS) {
    return {
      agentKey: "followups",
      activated: false,
      reason: "Bloqueado por contexto SOAP insuficiente",
      source: "transcript_soap",
    };
  }
  return evaluateRule(
    `${text} ${doctorText}`,
    /(control|seguimiento|reevaluar|volver|próxima consulta|proxima consulta|en\s+\d+\s+días|en\s+\d+\s+semanas)/i,
    "followups"
  );
}

export function shouldRunMedicationAgent(segments: TranscriptSegment[], soap: SOAPNote): boolean {
  return evaluateMedicationAgentRule(segments, soap).activated;
}
export function shouldRunStudiesAgent(segments: TranscriptSegment[], soap: SOAPNote): boolean {
  return evaluateStudiesAgentRule(segments, soap).activated;
}
export function shouldRunDocumentsAgent(segments: TranscriptSegment[], soap: SOAPNote): boolean {
  return evaluateDocumentsAgentRule(segments, soap).activated;
}
export function shouldRunFollowupsAgent(segments: TranscriptSegment[], soap: SOAPNote): boolean {
  return evaluateFollowupsAgentRule(segments, soap).activated;
}
