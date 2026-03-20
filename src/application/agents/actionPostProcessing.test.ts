import test from "node:test";
import assert from "node:assert/strict";
import {
  postProcessDocuments,
  postProcessFollowups,
  postProcessMedications,
  postProcessStudies,
} from "./actionPostProcessing";

test("postProcessMedications limpia, deduplica y descarta vacíos", () => {
  const result = postProcessMedications([
    { drug: " Ibuprofeno ", dose: "400mg", frequency: "c/8h", route: "VO", duration: "3 días" },
    { drug: "ibuprofeno", dose: "400mg", frequency: "c/8h", route: "vo", duration: "3 días" },
    { drug: " ", dose: "", frequency: "", route: "", duration: "" },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].drug, "Ibuprofeno");
});

test("postProcessStudies limpia, deduplica y descarta descripciones vacías", () => {
  const result = postProcessStudies([
    { type: "lab", description: " Hemograma " },
    { type: "lab", description: "hemograma" },
    { type: "imaging", description: " " },
  ]);
  assert.deepEqual(result, [{ type: "lab", description: "Hemograma" }]);
});

test("postProcessStudies reclasifica por semántica clínica", () => {
  const result = postProcessStudies([
    { type: "lab", description: "Solicitar radiografía de tórax" },
    { type: "imaging", description: "Interconsulta con cardiología" },
    { type: "referral", description: "Laboratorio completo con hemograma" },
  ]);

  assert.equal(result[0].type, "imaging");
  assert.equal(result[1].type, "referral");
  assert.equal(result[2].type, "lab");
});

test("postProcessDocuments limpia, deduplica y descarta títulos vacíos", () => {
  const result = postProcessDocuments([
    { type: "report", title: " Informe clínico ", rationale: " detalle " },
    { type: "report", title: "informe clínico", rationale: "detalle" },
    { type: "administrative", title: " " },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].title, "Informe clínico");
  assert.equal(result[0].rationale, "detalle");
});

test("postProcessFollowups limpia, deduplica y filtra frases cortas", () => {
  const result = postProcessFollowups(["  control en 72 hs ", "Control en 72 hs", "ok", "  "]);
  assert.deepEqual(result, ["control en 72 hs"]);
});
