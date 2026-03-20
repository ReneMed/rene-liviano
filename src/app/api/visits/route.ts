import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentProfessional } from "@/lib/auth";

const createVisitBodySchema = z.object({
  patientId: z.string().min(1),
});

/** Crea una visita vacía para la sesión actual (grabador / análisis complementarios antes del audio). */
export async function POST(request: Request) {
  try {
    const professional = await getCurrentProfessional();
    if (!professional) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = createVisitBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { patientId } = parsed.data;
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient || patient.professionalId !== professional.id) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }

    const visit = await prisma.visit.create({
      data: {
        patientId,
        professionalId: professional.id,
      },
    });

    return NextResponse.json({ id: visit.id });
  } catch (err) {
    console.error("POST visits error:", err);
    return NextResponse.json(
      { error: "Error al crear la visita" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const professional = await getCurrentProfessional();
    if (!professional) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const visits = await prisma.visit.findMany({
      where: { professionalId: professional.id },
      orderBy: { createdAt: "desc" },
      include: {
        patient: true,
      },
    });
    return NextResponse.json(
      visits.map((v) => ({
        id: v.id,
        patientId: v.patientId,
        patientName: v.patient.name,
        createdAt: v.createdAt,
        signedAt: v.signedAt,
      }))
    );
  } catch (err) {
    console.error("GET visits error:", err);
    return NextResponse.json(
      { error: "Error al obtener consultas" },
      { status: 500 }
    );
  }
}
