// TranscriptSegment - segmento de transcripción con speaker y timestamps
export interface TranscriptSegment {
  id?: string;
  speaker: "medico" | "paciente" | "acompanante";
  timestampStart: number;
  timestampEnd: number;
  text: string;
  confidence?: number;
  lowConfidence?: boolean;
}

// SOAPNote - nota clínica formato SOAP
export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

// Prescription - receta médica
export interface Prescription {
  id?: string;
  drug: string;
  dose: string;
  frequency: string;
  route: string;
  duration: string;
}

// MedicalOrder - orden médica (laboratorio, imágenes, interconsulta)
export interface MedicalOrder {
  id?: string;
  type: "lab" | "imaging" | "referral";
  description: string;
}

// LinkedEvidence - mapeo nota ↔ transcripción
export interface LinkedEvidence {
  segmentId: string;
  noteBlockId: string;
  noteBlockType: "subjective" | "objective" | "assessment" | "plan";
}

// PatientSummary - resumen para paciente (WhatsApp-ready)
export interface PatientSummary {
  text: string;
}

// Referral - carta de derivación
export interface Referral {
  text: string;
  specialist?: string;
}

// Justification - justificación para obra social/prepaga
export interface Justification {
  text: string;
}

// ExtractedMedication - acción explícita de medicación detectada
export interface ExtractedMedication {
  drug: string;
  dose: string;
  frequency: string;
  route: string;
  duration: string;
}

// ExtractedStudy - acción explícita de estudio/orden detectada
export interface ExtractedStudy {
  type: "lab" | "imaging" | "referral";
  description: string;
}

// ExtractedDocument - acción explícita de documento detectada
export interface ExtractedDocument {
  type: "certificate" | "report" | "administrative";
  title: string;
  rationale?: string;
}

// ExtractedActions - contrato intermedio común del pipeline
export interface ExtractedActions {
  medications: ExtractedMedication[];
  studies: ExtractedStudy[];
  documents: ExtractedDocument[];
  followups: string[];
}

function asCleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function sanitizeExtractedActions(input: Partial<ExtractedActions> | null | undefined): ExtractedActions {
  const medications = Array.isArray(input?.medications)
    ? input.medications.map((m) => ({
        drug: asCleanString(m?.drug),
        dose: asCleanString(m?.dose),
        frequency: asCleanString(m?.frequency),
        route: asCleanString(m?.route),
        duration: asCleanString(m?.duration),
      }))
    : [];

  const studies = Array.isArray(input?.studies)
    ? input.studies
        .map((s) => {
          const type = s?.type === "lab" || s?.type === "imaging" || s?.type === "referral" ? s.type : null;
          if (!type) return null;
          return {
            type,
            description: asCleanString(s?.description),
          };
        })
        .filter((s): s is ExtractedStudy => !!s)
    : [];

  const documents = Array.isArray(input?.documents)
    ? input.documents
        .map((d) => {
          const type =
            d?.type === "certificate" || d?.type === "report" || d?.type === "administrative"
              ? d.type
              : null;
          if (!type) return null;
          return {
            type,
            title: asCleanString(d?.title),
            rationale: asCleanString(d?.rationale) || undefined,
          };
        })
        .filter((d): d is ExtractedDocument => !!d)
    : [];

  const followups = Array.isArray(input?.followups)
    ? input.followups.map((f) => asCleanString(f)).filter(Boolean)
    : [];

  return { medications, studies, documents, followups };
}

// ProcessVisitResponse - respuesta del endpoint process
export interface ProcessVisitResponse {
  visitId: string;
  soap: SOAPNote;
  recetas: Prescription[];
  ordenes: MedicalOrder[];
  extracted_actions: ExtractedActions;
  resumen_paciente: PatientSummary;
  evidencias: LinkedEvidence[];
  referral?: Referral;
  justification?: Justification;
}

// ProcessProgressEvent - evento de progreso emitido durante procesamiento
export interface ProcessProgressEvent {
  stage: "visit_created" | "transcribing" | "generating" | "saving" | "completed";
  visitId?: string;
  transcript?: TranscriptSegment[];
  soap?: SOAPNote;
  soapBlock?: "subjective" | "objective" | "assessment" | "plan";
  medications?: ExtractedMedication[];
  studies?: ExtractedStudy[];
  patientSummary?: PatientSummary;
  referral?: Referral;
  justification?: Justification;
}

export type AgentActivationSource = "transcript_soap" | "uploaded_materials";

export interface AgentActivationDecision {
  agentKey:
    | "soap"
    | "medication"
    | "studies"
    | "documents"
    | "followups"
    /** Análisis de estudios complementarios cargados (PDF/imagen), distinto de órdenes extraídas por voz */
    | "complementary_studies_analysis";
  activated: boolean;
  reason: string;
  matchedPattern?: string;
  source: AgentActivationSource;
}

/** Motor de inferencia para análisis de material complementario (policy del producto) */
export type ComplementaryStudyAnalysisEngine = "medgemma" | "openai";

/** Clasificación clínica del archivo complementario */
export type ComplementaryStudyKind =
  | "laboratory"
  | "cardiac"
  | "dermatology_image"
  | "general_medical_image"
  | "unknown";

/** Entrada mínima para clasificar y enrutar un estudio cargado por el médico */
export interface UploadedComplementaryStudyInput {
  id: string;
  mimeType: string;
  fileName?: string;
  /** Texto extraído (OCR, capa de texto de PDF, etc.) */
  textPreview?: string;
  /** Contenido del archivo en base64 (sin prefijo data:). Imágenes: visión GPT; PDF: no se envía al modelo como imagen. */
  fileBase64?: string;
}

/** Decisión determinística de tipo + motor (auditable) */
export interface ComplementaryStudyRoutingDecision {
  studyId: string;
  kind: ComplementaryStudyKind;
  engine: ComplementaryStudyAnalysisEngine;
  reason: string;
  matchedRule?: string;
}

/** Estado frente a rango de referencia (laboratorio) */
export type ComplementaryLabValueStatus = "normal" | "bajo" | "elevado" | "indeterminado";

export interface ComplementaryLabValueRow {
  name: string;
  value: string;
  reference?: string;
  status: ComplementaryLabValueStatus;
}

/** Resultado por ítem tras pasar por el adaptador del motor (placeholder hasta integrar APIs) */
export interface ComplementaryStudyAnalysisItem {
  studyId: string;
  kind: ComplementaryStudyKind;
  engine: ComplementaryStudyAnalysisEngine;
  routingReason: string;
  analysis: {
    /** Texto continuo (compatibilidad); preferir summaryPoints en UI */
    summary: string;
    limitations: string;
    structuredNotes?: Record<string, string>;
    /** Viñetas cortas para lectura rápida (preferido) */
    summaryPoints?: string[];
    limitationsPoints?: string[];
    /** Tabla de valores con estado (laboratorio) */
    labValues?: ComplementaryLabValueRow[];
    /** Breve texto: qué está alterado y posibles orientaciones (no diagnóstico) */
    clinicalInterpretation?: string;
  };
}

export interface ComplementaryStudiesAnalysisResult {
  items: ComplementaryStudyAnalysisItem[];
}

// ProcessStreamEvent - contrato NDJSON del endpoint /api/visits/process
export type ProcessStreamEvent =
  | { type: "progress"; stage: ProcessProgressEvent["stage"] } & ProcessProgressEvent
  | { type: "done"; result: ProcessVisitResponse }
  | { type: "error"; message: string };

// AgentMode - estrategia de ejecución de agentes en orquestador
export type AgentMode = "deterministic" | "agentic" | "hybrid";

// AgentExecutionMeta - metadatos de ejecución de un agente
export interface AgentExecutionMeta {
  agentId: string;
  retries: number;
  timeoutMs: number;
  fallbackUsed: boolean;
  durationMs: number;
}

// AgentResult - resultado uniforme de ejecución de agente
export interface AgentResult<TOutput> {
  ok: boolean;
  output: TOutput;
  meta: AgentExecutionMeta;
  error?: string;
}

// VisitSummary - ítem de listado de consultas
export interface VisitSummary {
  id: string;
  patientName: string;
  createdAt: string;
  signedAt?: string;
}

// VisitPatient - datos de paciente en detalle de consulta
export interface VisitPatient {
  id: string;
  name: string;
  birthDate?: string | null;
  document?: string | null;
  sex?: string | null;
  coverage?: string | null;
  affiliateNumber?: string | null;
  plan?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

/** Lectura incorporada desde análisis complementarios (IA) — pestaña Lectura de análisis */
export interface ComplementaryAnalysisReadingEntry {
  id: string;
  createdAt: string;
  title?: string;
  content: string;
}

// VisitDetail - contrato de detalle de consulta en frontend
export interface VisitDetail {
  id: string;
  patient: VisitPatient;
  soap: SOAPNote | null;
  transcript: { segments: TranscriptSegment[] } | null;
  extractedActions: ExtractedActions;
  /** Textos detallados agregados desde el modal de estudios complementarios */
  analysisReadings?: ComplementaryAnalysisReadingEntry[];
  agentAudit?: AgentActivationDecision[];
  patientSummary: string | null;
  referral?: Referral;
  justification?: Justification;
  signedAt?: string;
}
