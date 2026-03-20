import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentProfessional } from "@/lib/auth";

const bodySchema = z.object({
  title: z.string().max(500).optional(),
  content: z.string().min(1).max(500_000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const professional = await getCurrentProfessional();
    if (!professional) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: visitId } = await params;
    const visit = await prisma.visit.findUnique({
      where: { id: visitId, professionalId: professional.id },
    });
    if (!visit) {
      return NextResponse.json({ error: "Visita no encontrada" }, { status: 404 });
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Cuerpo inválido", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, content } = parsed.data;
    const row = await prisma.complementaryAnalysisReading.create({
      data: {
        visitId,
        title: title?.trim() || null,
        content: content.trim(),
      },
    });

    return NextResponse.json({
      reading: {
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        title: row.title ?? undefined,
        content: row.content,
      },
    });
  } catch (err) {
    console.error("POST complementary-readings:", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
