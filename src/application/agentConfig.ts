function parseEnvInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
}

export function getAgentConfig() {
  return {
    mode: "deterministic" as const,
    soap: {
      timeoutMs: parseEnvInt("AGENT_SOAP_TIMEOUT_MS", 40_000),
      retries: parseEnvInt("AGENT_SOAP_RETRIES", 1),
    },
    medication: {
      timeoutMs: parseEnvInt("AGENT_MEDICATION_TIMEOUT_MS", 25_000),
      retries: parseEnvInt("AGENT_MEDICATION_RETRIES", 1),
    },
    studies: {
      timeoutMs: parseEnvInt("AGENT_STUDIES_TIMEOUT_MS", 25_000),
      retries: parseEnvInt("AGENT_STUDIES_RETRIES", 1),
    },
    documents: {
      timeoutMs: parseEnvInt("AGENT_DOCUMENTS_TIMEOUT_MS", 25_000),
      retries: parseEnvInt("AGENT_DOCUMENTS_RETRIES", 1),
    },
    followups: {
      timeoutMs: parseEnvInt("AGENT_FOLLOWUPS_TIMEOUT_MS", 20_000),
      retries: parseEnvInt("AGENT_FOLLOWUPS_RETRIES", 1),
    },
    /** Análisis de estudios complementarios cargados (MedGemma / OpenAI) — uso futuro desde API de adjuntos */
    complementaryStudiesAnalysis: {
      timeoutMs: parseEnvInt("AGENT_COMPLEMENTARY_STUDIES_TIMEOUT_MS", 60_000),
      retries: parseEnvInt("AGENT_COMPLEMENTARY_STUDIES_RETRIES", 1),
    },
  };
}
