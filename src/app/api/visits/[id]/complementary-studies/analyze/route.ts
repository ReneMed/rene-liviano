import { NextResponse } from "next/server";

/** Tiempo máximo para visión + GPT (Vercel / hosting). */
export const maxDuration = 120;
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentProfessional } from "@/lib/auth";
import { getAgentConfig } from "@/application/agentConfig";
import { runAgent } from "@/application/agent-runtime/runAgent";
import { runComplementaryStudiesAnalysisAgent } from "@/application/agents/complementaryStudiesAnalysisAgent";
import { evaluateComplementaryStudiesAnalysisRule } from "@/application/agents/complementaryStudiesRouting";
import { createAgentDecisionRepository } from "@repositories";
import type { ComplementaryStudiesAnalysisResult } from "@shared-types";

const uploadSchema = z.object({
  id: z.string().min(1),
  mimeType: z.string().min(1),
  fileName: z.string().optional(),
  textPreview: z.string().optional(),
  /** Base64 sin prefijo data: — imágenes para visión GPT (~5 MB archivo) */
  fileBase64: z.string().max(8_000_000).optional(),
});

const bodySchema = z.object({
  uploads: z.array(uploadSchema).max(25),
});

function buildAuditReason(
  baseReason: string,
  ok: boolean,
  error: string | undefined,
  result: ComplementaryStudiesAnalysisResult
): string {
  if (!ok && error) {
    return `${baseReason} | ejecución: error (${error})`;
  }
  if (!result.items.length) {
    return baseReason;
  }
  const engines = result.items.map((i) => `${i.engine}:${i.kind}`).join(", ");
  return `${baseReason} | resultados: ${engines}`;
}

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

    const { uploads } = parsed.data;
    const evaluation = evaluateComplementaryStudiesAnalysisRule(uploads);
    const agentConfig = getAgentConfig().complementaryStudiesAnalysis;

    const agentResult = await runAgent<ComplementaryStudiesAnalysisResult>({
      agentId: "complementary_studies_analysis_agent",
      timeoutMs: agentConfig.timeoutMs,
      retries: agentConfig.retries,
      fallback: () => ({ items: [] }),
      run: () => runComplementaryStudiesAnalysisAgent(uploads),
    });

    const output = agentResult.output;
    const auditReason = buildAuditReason(
      evaluation.reason,
      agentResult.ok,
      agentResult.error,
      output
    );

    const agentDecisionRepo = createAgentDecisionRepository();

    if (!agentResult.ok) {
      const failMsg = agentResult.error ?? "Fallo al ejecutar el análisis (timeout o error del modelo)";
      await agentDecisionRepo.createMany({
        visitId,
        decisions: [
          {
            agentKey: "complementary_studies_analysis",
            activated: false,
            reason: `${evaluation.reason} | ${failMsg}`,
            matchedPattern: evaluation.matchedPattern,
            source: "uploaded_materials",
          },
        ],
      });
      return NextResponse.json({ error: failMsg }, { status: 502 });
    }

    await agentDecisionRepo.createMany({
      visitId,
      decisions: [
        {
          agentKey: "complementary_studies_analysis",
          activated: evaluation.activated,
          reason: auditReason,
          matchedPattern:
            evaluation.activated && output.items.length
              ? `${output.items.length} ítem(s)`
              : evaluation.matchedPattern,
          source: "uploaded_materials",
        },
      ],
    });

    return NextResponse.json({
      activation: {
        ...evaluation,
        reason: auditReason,
        activated: evaluation.activated,
      },
      result: output,
      meta: {
        ok: true,
        error: undefined,
        durationMs: agentResult.meta.durationMs,
        retries: agentResult.meta.retries,
        fallbackUsed: agentResult.meta.fallbackUsed,
      },
    });
  } catch (err) {
    console.error("POST complementary-studies/analyze:", err);
    const message =
      err instanceof Error ? err.message : "Error al analizar estudios complementarios";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
