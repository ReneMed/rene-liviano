import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateComplementaryStudiesAnalysisRule,
  routeComplementaryStudy,
} from "./complementaryStudiesRouting";

test("evaluateComplementaryStudiesAnalysisRule sin archivos no activa", () => {
  const d = evaluateComplementaryStudiesAnalysisRule([]);
  assert.equal(d.activated, false);
  assert.equal(d.agentKey, "complementary_studies_analysis");
  assert.equal(d.source, "uploaded_materials");
});

test("evaluateComplementaryStudiesAnalysisRule activa con PDF o imagen", () => {
  const d = evaluateComplementaryStudiesAnalysisRule([
    { id: "1", mimeType: "application/pdf", fileName: "lab.pdf" },
  ]);
  assert.equal(d.activated, true);
});

test("routeComplementaryStudy: imagen dermatológica → OpenAI", () => {
  const r = routeComplementaryStudy({
    id: "a",
    mimeType: "image/jpeg",
    fileName: "lesion_piel.jpg",
    textPreview: "",
  });
  assert.equal(r.kind, "dermatology_image");
  assert.equal(r.engine, "openai");
});

test("routeComplementaryStudy: imagen genérica → OpenAI (MVP; MedGemma después)", () => {
  const r = routeComplementaryStudy({
    id: "b",
    mimeType: "image/png",
    fileName: "rx_torax.png",
  });
  assert.equal(r.kind, "general_medical_image");
  assert.equal(r.engine, "openai");
});

test("routeComplementaryStudy: laboratorio en texto → OpenAI", () => {
  const r = routeComplementaryStudy({
    id: "c",
    mimeType: "application/pdf",
    fileName: "resultados.pdf",
    textPreview: "Hemograma completo con leucocitosis discreta.",
  });
  assert.equal(r.kind, "laboratory");
  assert.equal(r.engine, "openai");
});

test("routeComplementaryStudy: ECG en nombre → OpenAI cardiológico", () => {
  const r = routeComplementaryStudy({
    id: "d",
    mimeType: "image/jpeg",
    fileName: "ECG_basal.jpg",
  });
  assert.equal(r.kind, "cardiac");
  assert.equal(r.engine, "openai");
});
