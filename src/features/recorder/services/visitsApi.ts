/** Crea una visita vacía para la sesión (mismo paciente/profesional que el grabador). */
export async function createVisitSession(patientId: string): Promise<string> {
  const res = await fetch("/api/visits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientId }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "No se pudo crear la visita");
  }
  if (!data.id) {
    throw new Error("Respuesta inválida del servidor");
  }
  return data.id;
}
