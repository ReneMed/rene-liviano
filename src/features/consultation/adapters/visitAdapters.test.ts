import test from "node:test";
import assert from "node:assert/strict";
import { normalizeVisitDetail } from "./visitAdapters";

test("normalizeVisitDetail completa extractedActions faltante", () => {
  const normalized = normalizeVisitDetail({
    id: "v1",
    patient: { id: "p1", name: "Paciente 1" },
    soap: null,
    transcript: null,
    patientSummary: null,
    extractedActions: {
      medications: [],
      studies: [],
      documents: [],
      followups: [],
    },
  });

  assert.deepEqual(normalized.extractedActions, {
    medications: [],
    studies: [],
    documents: [],
    followups: [],
  });
  assert.deepEqual(normalized.analysisReadings, []);
});

test("normalizeVisitDetail sanea estructuras inválidas sin romper contrato", () => {
  const normalized = normalizeVisitDetail({
    id: "v2",
    patient: { id: "p2", name: "Paciente 2" },
    soap: null,
    transcript: null,
    patientSummary: null,
    extractedActions: {
      medications: [{ drug: " Paracetamol ", dose: "500mg", frequency: "c/8h", route: "VO", duration: "3 días" }],
      studies: [{ type: "invalid", description: "x" }] as unknown as Array<{
        type: "lab" | "imaging" | "referral";
        description: string;
      }>,
      documents: [{ type: "report", title: " Informe ", rationale: "  detalle " }],
      followups: ["", " control "],
    },
  });

  assert.equal(normalized.extractedActions.medications[0].drug, "Paracetamol");
  assert.equal(normalized.extractedActions.studies.length, 0);
  assert.equal(normalized.extractedActions.documents[0].title, "Informe");
  assert.deepEqual(normalized.extractedActions.followups, ["control"]);
  assert.deepEqual(normalized.analysisReadings, []);
});
