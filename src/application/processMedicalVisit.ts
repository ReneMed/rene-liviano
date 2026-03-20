import type { TranscriptSegment, ProcessVisitResponse, ProcessProgressEvent } from "@shared-types";
import type { SOAPNote } from "@shared-types";
import { processAudio } from "@services/audio-processing";
import {
  buildLinkedEvidence,
  generateSOAPBlock,
  generateJustification,
  generatePatientSummary,
  generateReferral,
  hasUsableClinicalTranscript,
} from "@services/ai-orchestrator";
import { traceStage } from "./pipelineTelemetry";
import { runAgent } from "./agent-runtime/runAgent";
import { runSoapAgent } from "./agents/soapAgent";
import { runMedicationAgent } from "./agents/medicationAgent";
import { runMedicationIssuingFlow } from "./agents/qbi2MedicationFlow";
import { runStudiesAgent } from "./agents/studiesAgent";
import { runDocumentsAgent } from "./agents/documentsAgent";
import { runFollowupsAgent } from "./agents/followupsAgent";
import { aggregateExtractedActions } from "./agents/aggregateActions";
import {
  evaluateMedicationAgentRule,
  evaluateStudiesAgentRule,
  evaluateDocumentsAgentRule,
  evaluateFollowupsAgentRule,
} from "./agents/actionAgentRules";
import { getAgentConfig } from "./agentConfig";
import {
  createPatientRepository,
  createVisitRepository,
  createTranscriptRepository,
  createNoteRepository,
  createPrescriptionRepository,
  createMedicalOrderRepository,
  createPatientSummaryRepository,
  createReferralRepository,
  createJustificationRepository,
  createAgentDecisionRepository,
} from "@repositories";

async function generateSoapDeterministic(
  segments: TranscriptSegment[],
  saveTranscriptPromise: Promise<unknown>,
  onBlockGenerated: (block: keyof SOAPNote, soap: SOAPNote) => Promise<void>
): Promise<SOAPNote> {
  const soap: SOAPNote = {
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  };
  const soapBlocks: Array<keyof SOAPNote> = ["subjective", "objective", "assessment", "plan"];

  for (let i = 0; i < soapBlocks.length; i++) {
    const block = soapBlocks[i];
    const text =
      i === 0
        ? (
            await Promise.all([
              saveTranscriptPromise,
              generateSOAPBlock(segments, block, soap),
            ])
          )[1]
        : await generateSOAPBlock(segments, block, soap);
    soap[block] = text;
    await onBlockGenerated(block, soap);
  }

  return soap;
}

export async function processMedicalVisit(
  audioBuffer: Buffer,
  professional: { id: string; name?: string; email?: string },
  patientId: string,
  onProgress?: (event: ProcessProgressEvent) => void,
  options?: { existingVisitId?: string }
): Promise<ProcessVisitResponse> {
  const agentConfig = getAgentConfig();
  const patientRepo = createPatientRepository();
  const visitRepo = createVisitRepository();
  const transcriptRepo = createTranscriptRepository();
  const noteRepo = createNoteRepository();
  const prescriptionRepo = createPrescriptionRepository();
  const orderRepo = createMedicalOrderRepository();
  const summaryRepo = createPatientSummaryRepository();
  const referralRepo = createReferralRepository();
  const justificationRepo = createJustificationRepository();
  const agentDecisionRepo = createAgentDecisionRepository();

  const visit = await traceStage("resolve_visit", undefined, async () => {
    if (options?.existingVisitId) {
      const existing = await visitRepo.findById(options.existingVisitId);
      if (!existing) {
        throw new Error("Visita no encontrada");
      }
      if (existing.patientId !== patientId) {
        throw new Error("La visita no corresponde al paciente seleccionado");
      }
      if (existing.professionalId !== professional.id) {
        throw new Error("Visita no autorizada");
      }
      const existingTranscript = await transcriptRepo.findByVisitId(existing.id);
      if (existingTranscript) {
        throw new Error("Esta visita ya tiene una transcripción registrada");
      }
      return existing;
    }
    return visitRepo.create({ patientId, professionalId: professional.id });
  });
  onProgress?.({ stage: "visit_created", visitId: visit.id });

  onProgress?.({ stage: "transcribing", visitId: visit.id });
  const segments: TranscriptSegment[] = await traceStage("transcribe_audio", visit.id, () =>
    processAudio(audioBuffer)
  );

  // Transcripción al cliente de inmediato; no esperar a Prisma para empezar la nota clínica.
  onProgress?.({ stage: "transcribing", visitId: visit.id, transcript: segments });
  onProgress?.({ stage: "generating", visitId: visit.id });

  const soapBlocks: Array<"subjective" | "objective" | "assessment" | "plan"> = [
    "subjective",
    "objective",
    "assessment",
    "plan",
  ];

  const saveTranscriptPromise: Promise<unknown> = traceStage("save_transcript", visit.id, async () => {
    await transcriptRepo.create({
      visitId: visit.id,
      segments,
    });
  });

  const unusableTranscript = !hasUsableClinicalTranscript(segments);

  if (unusableTranscript) {
    const soap: ProcessVisitResponse["soap"] = {
      subjective:
        "No se detectó habla clínica utilizable en la grabación (silencio, audio insuficiente o transcripción vacía). No se generó contenido inferido.",
      objective: "",
      assessment: "",
      plan: "Repetir la grabación con el micrófono activo o verificar el dispositivo de audio.",
    };

    await saveTranscriptPromise;
    await traceStage("save_note_empty", visit.id, () => noteRepo.create({ visitId: visit.id, soap }));

    for (const block of soapBlocks) {
      onProgress?.({ stage: "saving", visitId: visit.id, soap, soapBlock: block });
    }

    await traceStage("save_medications_empty", visit.id, () =>
      prescriptionRepo.createMany({ visitId: visit.id, prescriptions: [] })
    );
    onProgress?.({ stage: "saving", visitId: visit.id, medications: [] });
    await traceStage("save_studies_empty", visit.id, () =>
      orderRepo.createMany({ visitId: visit.id, orders: [] })
    );
    onProgress?.({ stage: "saving", visitId: visit.id, studies: [] });
    await traceStage("save_patient_summary_empty", visit.id, () =>
      summaryRepo.create({
        visitId: visit.id,
        text: "No se generó resumen: no hubo transcripción utilizable.",
      })
    );
    onProgress?.({
      stage: "saving",
      visitId: visit.id,
      patientSummary: { text: "No se generó resumen: no hubo transcripción utilizable." },
    });

    const evidencias = buildLinkedEvidence(soap, segments);
    onProgress?.({ stage: "completed", visitId: visit.id });

    return {
      visitId: visit.id,
      soap,
      recetas: [],
      ordenes: [],
      extracted_actions: {
        medications: [],
        studies: [],
        documents: [],
        followups: [],
      },
      resumen_paciente: { text: "No se generó resumen: no hubo transcripción utilizable." },
      evidencias,
      referral: undefined,
      justification: undefined,
    };
  }

  let noteCreated = false;
  const persistSoapBlock = async (block: keyof SOAPNote, soap: SOAPNote) => {
    if (!noteCreated) {
      await traceStage("save_note_initial", visit.id, () => noteRepo.create({ visitId: visit.id, soap }));
      noteCreated = true;
    } else {
      await traceStage("save_note_update", visit.id, () => noteRepo.update({ visitId: visit.id, soap }));
    }
    onProgress?.({ stage: "saving", visitId: visit.id, soap, soapBlock: block });
  };

  const soapResult = await traceStage("agent_soap", visit.id, () =>
    runAgent<SOAPNote>({
      agentId: "soap_agent",
      timeoutMs: agentConfig.soap.timeoutMs,
      retries: agentConfig.soap.retries,
      fallback: () => ({
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
      }),
      run: () =>
        runSoapAgent({
          segments,
          onBlockGenerated: (block, partialSoap) =>
            traceStage(`save_soap_block_${block}`, visit.id, () =>
              persistSoapBlock(block, partialSoap)
            ),
        }),
    })
  );

  const soap =
    soapResult.ok
      ? soapResult.output
      : await traceStage("fallback_soap_deterministic", visit.id, () =>
          generateSoapDeterministic(segments, saveTranscriptPromise, (block, partialSoap) =>
            traceStage(`save_soap_block_${block}`, visit.id, () => persistSoapBlock(block, partialSoap))
          )
        );

  const medicationDecision = evaluateMedicationAgentRule(segments, soap);
  const studiesDecision = evaluateStudiesAgentRule(segments, soap);
  const documentsDecision = evaluateDocumentsAgentRule(segments, soap);
  const followupsDecision = evaluateFollowupsAgentRule(segments, soap);

  const runMedications = medicationDecision.activated;
  const runStudies = studiesDecision.activated;
  const runDocuments = documentsDecision.activated;
  const runFollowups = followupsDecision.activated;

  const medicationsResult = runMedications
    ? await traceStage("agent_medications", visit.id, () =>
        runAgent({
          agentId: "medication_agent",
          timeoutMs: agentConfig.medication.timeoutMs,
          retries: agentConfig.medication.retries,
          fallback: () => [],
          run: () => runMedicationAgent(segments, soap),
        })
      )
    : { ok: true, output: [], meta: { agentId: "medication_agent", retries: 0, timeoutMs: 0, fallbackUsed: false, durationMs: 0 } };

  const studiesResult = runStudies
    ? await traceStage("agent_studies", visit.id, () =>
        runAgent({
          agentId: "studies_agent",
          timeoutMs: agentConfig.studies.timeoutMs,
          retries: agentConfig.studies.retries,
          fallback: () => [],
          run: () => runStudiesAgent(segments, soap),
        })
      )
    : { ok: true, output: [], meta: { agentId: "studies_agent", retries: 0, timeoutMs: 0, fallbackUsed: false, durationMs: 0 } };

  const documentsResult = runDocuments
    ? await traceStage("agent_documents", visit.id, () =>
        runAgent({
          agentId: "documents_agent",
          timeoutMs: agentConfig.documents.timeoutMs,
          retries: agentConfig.documents.retries,
          fallback: () => [],
          run: () => runDocumentsAgent(segments, soap),
        })
      )
    : { ok: true, output: [], meta: { agentId: "documents_agent", retries: 0, timeoutMs: 0, fallbackUsed: false, durationMs: 0 } };

  const followupsResult = runFollowups
    ? await traceStage("agent_followups", visit.id, () =>
        runAgent({
          agentId: "followups_agent",
          timeoutMs: agentConfig.followups.timeoutMs,
          retries: agentConfig.followups.retries,
          fallback: () => [],
          run: () => runFollowupsAgent(segments, soap),
        })
      )
    : { ok: true, output: [], meta: { agentId: "followups_agent", retries: 0, timeoutMs: 0, fallbackUsed: false, durationMs: 0 } };

  const extractedActions = aggregateExtractedActions({
    medications: medicationsResult.output,
    studies: studiesResult.output,
    documents: documentsResult.output,
    followups: followupsResult.output,
  });

  const patientSnapshot = await traceStage("load_patient_for_qbi2", visit.id, () =>
    patientRepo.findById(patientId)
  );
  const medicationIssueDecision = runMedicationIssuingFlow({
    patient: {
      name: patientSnapshot?.name,
      document: patientSnapshot?.document,
      birthDate: patientSnapshot?.birthDate,
    },
    professional: {
      name: professional.name,
    },
    medications: extractedActions.medications,
    soap,
  });

  await traceStage("save_agent_decisions", visit.id, () =>
    agentDecisionRepo.createMany({
      visitId: visit.id,
      decisions: [
        { agentKey: "soap", activated: true, reason: "SOAP agent ejecutado", source: "transcript_soap" },
        {
          ...medicationDecision,
          reason: `${medicationDecision.reason} | QBI2: ${medicationIssueDecision.status}`,
        },
        studiesDecision,
        documentsDecision,
        followupsDecision,
      ],
    })
  );

  const prescriptions = extractedActions.medications;
  await traceStage("save_medications", visit.id, () =>
    prescriptionRepo.createMany({ visitId: visit.id, prescriptions })
  );
  onProgress?.({ stage: "saving", visitId: visit.id, medications: prescriptions });

  const orders = extractedActions.studies;
  await traceStage("save_studies", visit.id, () => orderRepo.createMany({ visitId: visit.id, orders }));
  onProgress?.({ stage: "saving", visitId: visit.id, studies: orders });

  const patientSummary = await traceStage("generate_patient_summary", visit.id, () =>
    generatePatientSummary(segments, soap)
  );
  await traceStage("save_patient_summary", visit.id, () =>
    summaryRepo.create({ visitId: visit.id, text: patientSummary.text })
  );
  onProgress?.({ stage: "saving", visitId: visit.id, patientSummary });

  const referral = await traceStage("generate_referral", visit.id, () =>
    generateReferral(segments, soap)
  );
  if (referral?.text?.trim()) {
    await traceStage("save_referral", visit.id, () =>
      referralRepo.create({
        visitId: visit.id,
        text: referral.text,
        specialist: referral.specialist,
      })
    );
    onProgress?.({ stage: "saving", visitId: visit.id, referral });
  }

  const justification = await traceStage("generate_justification", visit.id, () =>
    generateJustification(segments, soap)
  );
  if (justification?.text?.trim()) {
    await traceStage("save_justification", visit.id, () =>
      justificationRepo.create({
        visitId: visit.id,
        text: justification.text,
      })
    );
    onProgress?.({ stage: "saving", visitId: visit.id, justification });
  }

  const evidencias = buildLinkedEvidence(soap, segments);
  onProgress?.({ stage: "completed", visitId: visit.id });

  return {
    visitId: visit.id,
    soap,
    recetas: prescriptions,
    ordenes: orders,
    extracted_actions: extractedActions,
    resumen_paciente: patientSummary,
    evidencias,
    referral,
    justification,
  };
}
