/**
 * Mientras hay procesamiento activo, el GET /api/visits/:id puede devolver
 * soap: null (la nota aún no está en BD) y borrar lo que ya mergeó el stream.
 * Preservamos soap y transcript del estado actual si el API no los trae aún.
 */
export function mergeVisitDetailForProcessing<
  T extends {
    id: string;
    soap: unknown;
    transcript: unknown;
    analysisReadings?: unknown;
  },
>(incoming: T, current: T | null, processingActive: boolean): T {
  if (!processingActive || !current || current.id !== incoming.id) {
    return incoming;
  }
  const mergedReadings =
    incoming.analysisReadings != null ? incoming.analysisReadings : current.analysisReadings;
  return {
    ...incoming,
    soap: incoming.soap ?? current.soap,
    transcript: incoming.transcript ?? current.transcript,
    analysisReadings: mergedReadings as T["analysisReadings"],
  };
}
