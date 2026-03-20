import test from "node:test";
import assert from "node:assert/strict";
import type { SOAPNote, TranscriptSegment } from "@shared-types";
import {
  shouldRunMedicationAgent,
  shouldRunStudiesAgent,
  shouldRunDocumentsAgent,
  shouldRunFollowupsAgent,
  evaluateStudiesAgentRule,
  evaluateDocumentsAgentRule,
  evaluateFollowupsAgentRule,
} from "./actionAgentRules";

const baseSoap: SOAPNote = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

function segments(text: string): TranscriptSegment[] {
  return [
    {
      speaker: "medico",
      timestampStart: 0,
      timestampEnd: 1,
      text,
    },
  ];
}

function mixedSegments(entries: Array<{ speaker: TranscriptSegment["speaker"]; text: string }>): TranscriptSegment[] {
  return entries.map((entry, index) => ({
    speaker: entry.speaker,
    timestampStart: index,
    timestampEnd: index + 1,
    text: entry.text,
  }));
}

function lowConfidenceSegments(text: string): TranscriptSegment[] {
  return [
    {
      speaker: "medico",
      timestampStart: 0,
      timestampEnd: 1,
      text,
      confidence: 0.4,
      lowConfidence: true,
    },
    {
      speaker: "paciente",
      timestampStart: 1,
      timestampEnd: 2,
      text: "ruido",
      confidence: 0.5,
      lowConfidence: true,
    },
  ];
}

test("shouldRunMedicationAgent detecta lenguaje de prescripción", () => {
  assert.equal(
    shouldRunMedicationAgent(
      segments("Indico ibuprofeno 400 mg cada 8h por 3 días."),
      { ...baseSoap }
    ),
    true
  );
  assert.equal(
    shouldRunMedicationAgent(segments("Paciente estable, sin indicaciones farmacológicas al alta."), {
      ...baseSoap,
    }),
    false
  );
});

test("shouldRunMedicationAgent respeta negación explícita", () => {
  assert.equal(
    shouldRunMedicationAgent(
      segments("Se evalúa cuadro respiratorio, sin medicación al alta."),
      { ...baseSoap }
    ),
    false
  );
});

test("shouldRunMedicationAgent evita activar por mención aislada del paciente", () => {
  const withOnlyPatientMention = mixedSegments([
    { speaker: "paciente", text: "Yo tomo ibuprofeno en casa." },
    { speaker: "medico", text: "Sin cambios terapéuticos por el momento." },
  ]);
  assert.equal(shouldRunMedicationAgent(withOnlyPatientMention, { ...baseSoap }), false);
});

test("shouldRunStudiesAgent detecta lenguaje de órdenes/estudios", () => {
  assert.equal(
    shouldRunStudiesAgent(segments("Solicito laboratorio con hemograma y perfil lipídico."), {
      ...baseSoap,
      objective: "Solicitar laboratorio con hemograma y perfil lipidico para control evolutivo.",
    }),
    true
  );
  assert.equal(
    shouldRunStudiesAgent(segments("Continuar hidratación y reposo domiciliario."), { ...baseSoap }),
    false
  );
});

test("shouldRunStudiesAgent respeta negación de estudios", () => {
  assert.equal(
    shouldRunStudiesAgent(
      segments("Paciente estable, no se solicitan estudios complementarios."),
      { ...baseSoap }
    ),
    false
  );
});

test("evaluateStudiesAgentRule bloquea por baja confianza", () => {
  const decision = evaluateStudiesAgentRule(
    lowConfidenceSegments("Solicitar laboratorio completo."),
    { ...baseSoap, objective: "Solicitar laboratorio completo y control evolutivo." }
  );
  assert.equal(decision.activated, false);
  assert.match(decision.reason, /baja confianza/i);
});

test("evaluateStudiesAgentRule bloquea por contexto SOAP insuficiente", () => {
  const decision = evaluateStudiesAgentRule(
    segments("Solicitar laboratorio."),
    { ...baseSoap, objective: "Laboratorio", plan: "" }
  );
  assert.equal(decision.activated, false);
  assert.match(decision.reason, /contexto SOAP insuficiente/i);
});

test("shouldRunDocumentsAgent detecta lenguaje documental", () => {
  assert.equal(
    shouldRunDocumentsAgent(segments("Emitir certificado de reposo por 48 horas."), {
      ...baseSoap,
      plan: "Emitir certificado médico laboral por reposo de 48 horas con control.",
    }),
    true
  );
  assert.equal(
    shouldRunDocumentsAgent(segments("Sin requerimientos administrativos."), { ...baseSoap }),
    false
  );
});

test("shouldRunDocumentsAgent respeta negación documental", () => {
  assert.equal(
    shouldRunDocumentsAgent(
      segments("No requiere certificado ni documentación para esta consulta."),
      { ...baseSoap }
    ),
    false
  );
});

test("evaluateDocumentsAgentRule bloquea por baja confianza", () => {
  const decision = evaluateDocumentsAgentRule(
    lowConfidenceSegments("Emitir certificado de reposo."),
    { ...baseSoap, plan: "Emitir certificado médico por reposo de 48 horas." }
  );
  assert.equal(decision.activated, false);
  assert.match(decision.reason, /baja confianza/i);
});

test("evaluateDocumentsAgentRule bloquea por contexto SOAP insuficiente", () => {
  const decision = evaluateDocumentsAgentRule(
    segments("Emitir certificado de reposo."),
    { ...baseSoap, plan: "Reposo." }
  );
  assert.equal(decision.activated, false);
  assert.match(decision.reason, /contexto SOAP insuficiente/i);
});

test("shouldRunFollowupsAgent detecta lenguaje de seguimiento", () => {
  assert.equal(
    shouldRunFollowupsAgent(segments("Control en 7 días y reevaluar evolución clínica."), {
      ...baseSoap,
      plan: "Control clínico en 7 días con reevaluación de síntomas y conducta.",
    }),
    true
  );
  assert.equal(
    shouldRunFollowupsAgent(segments("Alta médica definitiva, sin nueva cita programada."), {
      ...baseSoap,
    }),
    false
  );
});

test("shouldRunFollowupsAgent respeta negación de seguimiento", () => {
  assert.equal(
    shouldRunFollowupsAgent(segments("Alta definitiva, sin seguimiento posterior."), {
      ...baseSoap,
    }),
    false
  );
});

test("evaluateFollowupsAgentRule bloquea por baja confianza", () => {
  const decision = evaluateFollowupsAgentRule(
    lowConfidenceSegments("Control en 7 días."),
    { ...baseSoap, plan: "Control clínico en 7 días con reevaluación." }
  );
  assert.equal(decision.activated, false);
  assert.match(decision.reason, /baja confianza/i);
});

test("evaluateFollowupsAgentRule bloquea por contexto SOAP insuficiente", () => {
  const decision = evaluateFollowupsAgentRule(
    segments("Control en 7 días."),
    { ...baseSoap, plan: "Control." }
  );
  assert.equal(decision.activated, false);
  assert.match(decision.reason, /contexto SOAP insuficiente/i);
});
