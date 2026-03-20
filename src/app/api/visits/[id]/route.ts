import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfessional } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const professional = await getCurrentProfessional();
    if (!professional) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const visit = await prisma.visit.findUnique({
      where: { id, professionalId: professional.id },
      include: {
        patient: true,
        note: true,
        transcript: { include: { segments: true } },
        prescriptions: true,
        medicalOrders: true,
        patientSummary: true,
        referral: true,
        justification: true,
        agentDecisions: { orderBy: { createdAt: "asc" } },
        complementaryAnalysisReadings: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!visit) {
      return NextResponse.json({ error: "Visita no encontrada" }, { status: 404 });
    }

    const soap = visit.note
      ? {
          subjective: visit.note.subjective,
          objective: visit.note.objective,
          assessment: visit.note.assessment,
          plan: visit.note.plan,
        }
      : null;

    return NextResponse.json({
      id: visit.id,
      patient: visit.patient,
      soap,
      transcript: visit.transcript
        ? {
            segments: visit.transcript.segments.map((s) => ({
              speaker: s.speaker,
              timestampStart: s.timestampStart,
              timestampEnd: s.timestampEnd,
              text: s.text,
            })),
          }
        : null,
      extractedActions: {
        medications: visit.prescriptions.map((p) => ({
          drug: p.drug,
          dose: p.dose,
          frequency: p.frequency,
          route: p.route,
          duration: p.duration,
        })),
        studies: visit.medicalOrders.map((o) => ({
          type: o.type,
          description: o.description,
        })),
        documents: [],
        followups: [],
      },
      patientSummary: visit.patientSummary?.text ?? null,
      analysisReadings: visit.complementaryAnalysisReadings.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        title: r.title ?? undefined,
        content: r.content,
      })),
      agentAudit: visit.agentDecisions.map((d) => ({
        agentKey: d.agentKey,
        activated: d.activated,
        reason: d.reason,
        matchedPattern: d.matchedPattern ?? undefined,
        source: d.source,
      })),
      referral: visit.referral ? { text: visit.referral.text, specialist: visit.referral.specialist ?? undefined } : undefined,
      justification: visit.justification ? { text: visit.justification.text } : undefined,
      signedAt: visit.signedAt,
    });
  } catch (err) {
    console.error("GET visit error:", err);
    return NextResponse.json(
      { error: "Error al obtener visita" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const professional = await getCurrentProfessional();
    if (!professional) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.visit.findUnique({
      where: { id, professionalId: professional.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Visita no encontrada" }, { status: 404 });
    }
    const body = await request.json();

    if (body.soap) {
      await prisma.note.upsert({
        where: { visitId: id },
        create: {
          visitId: id,
          subjective: body.soap.subjective ?? "",
          objective: body.soap.objective ?? "",
          assessment: body.soap.assessment ?? "",
          plan: body.soap.plan ?? "",
        },
        update: {
          subjective: body.soap.subjective ?? "",
          objective: body.soap.objective ?? "",
          assessment: body.soap.assessment ?? "",
          plan: body.soap.plan ?? "",
        },
      });
    }

    if (body.sign) {
      await prisma.visit.update({
        where: { id },
        data: { signedAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH visit error:", err);
    return NextResponse.json(
      { error: "Error al actualizar" },
      { status: 500 }
    );
  }
}
