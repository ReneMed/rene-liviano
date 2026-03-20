import { NextResponse } from "next/server";
import { processMedicalVisit } from "@/application/processMedicalVisit";
import { getCurrentProfessional } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const professional = await getCurrentProfessional();
    if (!professional) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const audio = formData.get("audio") as File | null;
    const patientId = formData.get("patientId");

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json(
        { error: "Se requiere archivo de audio" },
        { status: 400 }
      );
    }

    const arrayBuffer = await audio.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const selectedPatientId =
      typeof patientId === "string" && patientId.trim() ? patientId.trim() : undefined;
    if (!selectedPatientId) {
      return NextResponse.json(
        { error: "Se requiere paciente para procesar la consulta" },
        { status: 400 }
      );
    }

    const visitIdRaw = formData.get("visitId");
    const existingVisitId =
      typeof visitIdRaw === "string" && visitIdRaw.trim() ? visitIdRaw.trim() : undefined;

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        void (async () => {
          try {
            const result = await processMedicalVisit(
              buffer,
              {
                id: professional.id,
                name: professional.name,
                email: professional.email,
              },
              selectedPatientId,
              (event) => {
                send({ type: "progress", ...event });
              },
              existingVisitId ? { existingVisitId } : undefined
            );
            send({ type: "done", result });
          } catch (err) {
            const raw = err instanceof Error ? err.message : "Error al procesar consulta";
            const message = raw.toLowerCase().includes("upload failed")
              ? "Error al subir el audio. Probá de nuevo en unos segundos. Si persiste, verificá que la grabación tenga al menos 10 segundos."
              : raw;
            send({ type: "error", message });
          } finally {
            controller.close();
          }
        })();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("processMedicalVisit error:", err);
    let message = err instanceof Error ? err.message : "Error al procesar consulta";
    if (message.toLowerCase().includes("upload failed")) {
      message = "Error al subir el audio. Probá de nuevo en unos segundos. Si persiste, verificá que la grabación tenga al menos 10 segundos.";
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
