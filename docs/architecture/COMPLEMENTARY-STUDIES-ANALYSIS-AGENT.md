# Agente de análisis de estudios complementarios (`complementary_studies_analysis`)

## Propósito

Separado del **`StudiesAgent`** (extracción de órdenes/estudios desde la **transcripción** hacia `extractedActions.studies` / órdenes).

Este agente procesa **material complementario cargado por el médico** (PDF, imágenes, texto extraído) para:

1. **Clasificar** el tipo de estudio (laboratorio, cardiológico, imagen dermatológica, imagen médica genérica, desconocido).
2. **Enrutar de forma determinística** al motor acordado:
   - **MedGemma**: imágenes médicas **genéricas** (p. ej. radiología sin subtipo específico en reglas).
   - **OpenAI (ChatGPT)**: laboratorio, estudios cardiológicos, **imágenes dermatológicas**, y fallbacks conservadores.

Las reglas viven en `src/application/agents/complementaryStudiesRouting.ts` (auditable).

## Integración

- **OpenAI (GPT)**: `openAiStudyAnalysisAdapter` llama a la API con `OPENAI_API_KEY`. Modelo por defecto `gpt-4o-mini`; variable opcional `COMPLEMENTARY_STUDIES_OPENAI_MODEL`. Imágenes (`image/jpeg|png|webp|gif`) se envían como **visión** (data URL base64). PDF: solo texto/contexto (sin render multimodal del PDF).
- Adjuntos: máx. **~5 MB** por archivo en cliente; el body incluye `fileBase64` (sin prefijo `data:`).
- El pipeline de grabación (`processMedicalVisit`) **no invoca** este agente.

### Sesión de visita (enfoque A)

- `POST /api/visits` con `{ "patientId": "..." }` crea una **visita vacía** para la sesión (p. ej. desde el grabador al elegir paciente).
- `POST /api/visits/process` acepta opcionalmente `visitId` en el `FormData` para **reutilizar** esa visita al procesar el audio (misma visita que análisis complementarios y grabación).

### API

`POST /api/visits/:visitId/complementary-studies/analyze`

- **Auth**: sesión del profesional (misma que el resto de API de visitas).
- **Body** (JSON):

```json
{
  "uploads": [
    {
      "id": "string-id-cliente",
      "mimeType": "image/jpeg",
      "fileName": "rx_torax.png",
      "textPreview": "opcional: OCR o texto extraído"
    }
  ]
}
```

- **Respuesta**: `{ activation, result, meta }` con `result.items` por archivo enrutado y decisión persistida en `AgentDecision` (`agentKey: complementary_studies_analysis`, `source: uploaded_materials`) para el panel ops.

## Contratos

Tipos en `@shared-types`: `UploadedComplementaryStudyInput`, `ComplementaryStudiesAnalysisResult`, `ComplementaryStudyRoutingDecision`, `AgentActivationDecision` con `agentKey: "complementary_studies_analysis"` y `source: "uploaded_materials"`.
