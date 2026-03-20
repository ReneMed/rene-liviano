"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PatientManagementModal } from "./components/PatientManagementModal";
import { useConsultationStore } from "@/shared/store/useConsultationStore";
import { useVisitDetailLoader } from "@/features/consultation/hooks/useVisitDetailLoader";
import { WaveformAnimation } from "./components/WaveformAnimation";
import { useAudioLevelMeter } from "./hooks/useAudioLevelMeter";
import { createPatientApi, fetchPatients } from "./services/patientsApi";
import { createVisitSession } from "./services/visitsApi";
import { ComplementaryStudiesFlow } from "./components/complementaryStudies/ComplementaryStudiesFlow";
import { buildWhatsappInviteMessage, parseQrPatientData } from "./utils/patientUtils";
import { createPatientSchema } from "@/shared/validation/patient";
import type { AddPatientOption, CreatePatientInput, PatientFormFields, PatientModalView, PatientOption, RecordingState } from "./types";
import type { ProcessStreamEvent } from "@shared-types";

/** Texto del pie en la pantalla de procesamiento (el cartel superior solo muestra paciente + barra). */
function getRecorderFooterStatus(p: {
  active: boolean;
  stage: string;
  message?: string;
}): string {
  if (!p.active) return "";
  if (p.message?.toLowerCase().includes("creando visita")) {
    return "Creando la visita…";
  }
  switch (p.stage) {
    case "uploading":
      return "Enviando y analizando audio…";
    case "transcribing":
      return "Transcribiendo la consulta…";
    case "generating":
      return "Generando nota clínica…";
    case "finalizing":
      if (p.message?.startsWith("Escribiendo")) return p.message;
      if (p.message?.toLowerCase().includes("aplicando")) return p.message ?? "Aplicando resultado en pantalla…";
      return "Guardando resultados…";
    case "error":
      return p.message ?? "Error al procesar";
    default:
      return p.message ?? "Procesando…";
  }
}

export function RecorderScreen() {
  const [state, setState] = useState<RecordingState>("idle");
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patientModalView, setPatientModalView] = useState<PatientModalView>("choose");
  const [addPatientOption, setAddPatientOption] = useState<AddPatientOption>("manual");
  const [patientSearch, setPatientSearch] = useState("");
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientBirthDate, setNewPatientBirthDate] = useState("");
  const [newPatientDocument, setNewPatientDocument] = useState("");
  const [newPatientSex, setNewPatientSex] = useState("");
  const [newPatientCoverage, setNewPatientCoverage] = useState("");
  const [newPatientAffiliateNumber, setNewPatientAffiliateNumber] = useState("");
  const [newPatientPlan, setNewPatientPlan] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [newPatientAddress, setNewPatientAddress] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [qrRawValue, setQrRawValue] = useState("");
  const [qrStatus, setQrStatus] = useState<string | null>(null);
  const [sessionVisitId, setSessionVisitId] = useState<string | null>(null);
  const [sessionVisitLoading, setSessionVisitLoading] = useState(false);
  const [sessionVisitError, setSessionVisitError] = useState<string | null>(null);
  const [complementaryModalOpen, setComplementaryModalOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const qrScanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { audioLevel, hasAudioSignal, startAudioMeter, stopAudioMeter } = useAudioLevelMeter();
  const { processing, setProcessing, setSelectedVisit } = useConsultationStore();
  const router = useRouter();
  const loadVisitDetail = useVisitDetailLoader();

  const loadPatients = useCallback(async () => {
    setIsLoadingPatients(true);
    try {
      const data = await fetchPatients();
      setPatients(data);
      setSelectedPatient((prev) => {
        if (!prev) return null;
        return data.find((p) => p.id === prev.id) ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar pacientes");
    } finally {
      setIsLoadingPatients(false);
    }
  }, []);

  const retrySessionVisit = useCallback(async () => {
    if (!selectedPatient?.id) return;
    setSessionVisitLoading(true);
    setSessionVisitError(null);
    try {
      const id = await createVisitSession(selectedPatient.id);
      setSessionVisitId(id);
    } catch (e) {
      setSessionVisitId(null);
      setSessionVisitError(e instanceof Error ? e.message : "No se pudo crear la visita");
    } finally {
      setSessionVisitLoading(false);
    }
  }, [selectedPatient?.id]);

  useEffect(() => {
    if (!selectedPatient?.id) {
      setSessionVisitId(null);
      setSessionVisitLoading(false);
      setSessionVisitError(null);
      return;
    }
    let cancelled = false;
    setSessionVisitLoading(true);
    setSessionVisitError(null);
    void (async () => {
      try {
        const id = await createVisitSession(selectedPatient.id);
        if (!cancelled) setSessionVisitId(id);
      } catch (e) {
        if (!cancelled) {
          setSessionVisitId(null);
          setSessionVisitError(e instanceof Error ? e.message : "No se pudo crear la visita");
        }
      } finally {
        if (!cancelled) setSessionVisitLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPatient?.id]);

  const stopQrScanner = useCallback(() => {
    if (qrScanIntervalRef.current) {
      clearInterval(qrScanIntervalRef.current);
      qrScanIntervalRef.current = null;
    }
    if (qrStreamRef.current) {
      qrStreamRef.current.getTracks().forEach((track) => track.stop());
      qrStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    setTimer(0);
    timerRef.current = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      if (!selectedPatient) {
        setError("Seleccioná un paciente antes de iniciar la grabación.");
        setIsPatientModalOpen(true);
        return;
      }
      if (sessionVisitLoading || !sessionVisitId) {
        setError("Esperá a que se cree la sesión de visita o reintentá con el botón de abajo.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setError("Tu navegador no soporta grabación de audio. Probá con Chrome o Edge.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startAudioMeter(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000);
      setState("recording");
      startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al acceder al micrófono");
    }
  }, [selectedPatient, sessionVisitId, sessionVisitLoading, startAudioMeter, startTimer]);

  const stopRecording = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== "recording") return;

    stopAudioMeter();
    stopTimer();

    try {
      /** El último trozo de audio llega en `ondataavailable` *después* de `stop()`; hay que esperar `stop`. */
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Tiempo de espera al cerrar la grabación. Probá de nuevo."));
        }, 15_000);
        const cleanup = () => clearTimeout(timeout);
        mr.addEventListener(
          "stop",
          () => {
            cleanup();
            mr.stream.getTracks().forEach((t) => t.stop());
            resolve();
          },
          { once: true }
        );
        mr.addEventListener(
          "error",
          () => {
            cleanup();
            reject(new Error("Error al grabar audio."));
          },
          { once: true }
        );
        mr.stop();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al finalizar la grabación.");
      setState("idle");
      mr.stream.getTracks().forEach((t) => t.stop());
      return;
    }

    setState("processing");

    const chunks = chunksRef.current;
    if (chunks.length === 0) {
      setError("La grabación está vacía. Grabá al menos unos segundos.");
      setState("idle");
      return;
    }

    const blob = new Blob(chunks, { type: "audio/webm" });
    if (blob.size < 800) {
      setError("El audio quedó muy corto o incompleto. Grabá un poco más e intentá de nuevo.");
      setState("idle");
      setProcessing({ active: false, stage: "idle" });
      return;
    }
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    if (selectedPatient?.id) {
      formData.append("patientId", selectedPatient.id);
    }
    if (sessionVisitId) {
      formData.append("visitId", sessionVisitId);
    }

    const patientLabel = selectedPatient
      ? `${selectedPatient.name}${selectedPatient.document ? ` · DNI ${selectedPatient.document}` : ""}`
      : undefined;

    setProcessing({
      active: true,
      stage: "uploading",
      message: "Subiendo audio…",
      patientLabel,
    });

    let visitIdFromStream: string | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let hasNavigatedToDashboard = false;

    try {
      const res = await fetch("/api/visits/process", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al procesar");
      }

      if (!res.body) {
        throw new Error("No se recibió respuesta del procesamiento");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";

      const mergeVisitPartial = (visitId: string, partial: Record<string, unknown>) => {
        const store = useConsultationStore.getState();
        const current = store.selectedVisit;
        if (!current || current.id !== visitId) return;
        store.setSelectedVisit({
          ...current,
          ...partial,
        });
      };

      const tryNavigateToDashboard = async () => {
        if (!visitIdFromStream || hasNavigatedToDashboard) return;
        hasNavigatedToDashboard = true;
        router.replace(`/dashboard?visitId=${visitIdFromStream}&processing=1`);
        await loadVisitDetail(visitIdFromStream);
        pollInterval = setInterval(() => {
          if (visitIdFromStream) {
            void loadVisitDetail(visitIdFromStream);
          }
        }, 1500);
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const event = JSON.parse(trimmed) as ProcessStreamEvent;

          if (event.type === "progress") {
            if (event.stage === "visit_created" && event.visitId) {
              setProcessing({
                active: true,
                stage: "uploading",
                message: "Creando visita…",
                patientLabel,
              });
            }
            if (event.visitId && !visitIdFromStream) {
              visitIdFromStream = event.visitId;
              setSelectedVisit({
                id: event.visitId,
                patient: {
                  id: selectedPatient?.id ?? "",
                  name: selectedPatient?.name ?? "Paciente",
                },
                soap: null,
                transcript: null,
                extractedActions: {
                  medications: [],
                  studies: [],
                  documents: [],
                  followups: [],
                },
                patientSummary: null,
              });
            }
            if (event.stage === "transcribing") {
              if (event.visitId && event.transcript) {
                mergeVisitPartial(event.visitId, {
                  transcript: { segments: event.transcript },
                });
              }
              setProcessing({
                active: true,
                stage: "transcribing",
                message: "Transcribiendo consulta...",
                patientLabel,
              });
            } else if (event.stage === "generating") {
              if (event.visitId) {
                mergeVisitPartial(event.visitId, {
                  soap: {
                    subjective: "",
                    objective: "",
                    assessment: "",
                    plan: "",
                  },
                });
              }
              setProcessing({
                active: true,
                stage: "generating",
                message: "Generando nota clínica y órdenes...",
                patientLabel,
              });
            } else if (event.stage === "saving") {
              if (event.visitId) {
                if (event.soap) {
                  mergeVisitPartial(event.visitId, { soap: event.soap });
                }
                if (event.soapBlock) {
                  const labels: Record<string, string> = {
                    subjective: "Subjetivo",
                    objective: "Objetivo",
                    assessment: "Evaluación",
                    plan: "Plan",
                  };
                  setProcessing({
                    active: true,
                    stage: "finalizing",
                    message: `Escribiendo ${labels[event.soapBlock]}...`,
                    patientLabel,
                  });
                }
                if (event.medications) {
                  mergeVisitPartial(event.visitId, {
                    extractedActions: {
                      medications: event.medications,
                      studies: event.studies ?? [],
                      documents: [],
                      followups: [],
                    },
                  });
                }
                if (event.studies) {
                  const current = useConsultationStore.getState().selectedVisit;
                  mergeVisitPartial(event.visitId, {
                    extractedActions: {
                      medications: current?.extractedActions?.medications ?? [],
                      studies: event.studies,
                      documents: [],
                      followups: [],
                    },
                  });
                }
                if (event.patientSummary) {
                  mergeVisitPartial(event.visitId, { patientSummary: event.patientSummary.text });
                }
                if (event.referral) {
                  mergeVisitPartial(event.visitId, { referral: event.referral });
                }
                if (event.justification) {
                  mergeVisitPartial(event.visitId, { justification: event.justification });
                }
              }
              setProcessing({
                active: true,
                stage: "finalizing",
                message: "Guardando resultados...",
                patientLabel,
              });
            }

            const hasFirstPayload =
              (event.transcript && event.transcript.length > 0) ||
              event.stage === "generating" ||
              (event.stage === "saving" && event.soap);
            if (visitIdFromStream && hasFirstPayload) {
              await tryNavigateToDashboard();
            }
          }

          if (event.type === "done") {
            visitIdFromStream = event.result.visitId;
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            if (!hasNavigatedToDashboard) {
              await tryNavigateToDashboard();
            }
            await loadVisitDetail(event.result.visitId);
            setProcessing({
              active: true,
              stage: "finalizing",
              message: "Aplicando resultado en pantalla...",
              patientLabel,
            });
            router.replace(`/dashboard?visitId=${event.result.visitId}`);
          }

          if (event.type === "error") {
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      setProcessing({
        active: true,
        stage: "error",
        message: err instanceof Error ? err.message : "Error al procesar consulta",
        patientLabel,
      });
      setError(err instanceof Error ? err.message : "Error al procesar");
      setState("idle");
    }
  }, [
    selectedPatient,
    sessionVisitId,
    setProcessing,
    setSelectedVisit,
    stopAudioMeter,
    stopTimer,
    router,
    loadVisitDetail,
  ]);

  const createPatient = useCallback(async () => {
    const form: PatientFormFields = {
      name: newPatientName.trim(),
      document: newPatientDocument.trim(),
      birthDate: newPatientBirthDate.trim(),
      sex: newPatientSex.trim(),
      coverage: newPatientCoverage.trim(),
      affiliateNumber: newPatientAffiliateNumber.trim(),
      plan: newPatientPlan.trim(),
      phone: newPatientPhone.trim(),
      email: newPatientEmail.trim(),
      address: newPatientAddress.trim(),
    };

    const parsed = createPatientSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos de paciente inválidos.");
      return;
    }
    setIsCreatingPatient(true);
    try {
      const payload: CreatePatientInput = {
        ...parsed.data,
      };
      const created = await createPatientApi(payload);
      setPatients((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedPatient(created);
      setNewPatientName("");
      setNewPatientBirthDate("");
      setNewPatientDocument("");
      setNewPatientSex("");
      setNewPatientCoverage("");
      setNewPatientAffiliateNumber("");
      setNewPatientPlan("");
      setNewPatientPhone("");
      setNewPatientEmail("");
      setNewPatientAddress("");
      setError(null);
      setIsPatientModalOpen(false);
      setPatientModalView("choose");
      setAddPatientOption("manual");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear paciente");
    } finally {
      setIsCreatingPatient(false);
    }
  }, [newPatientAddress, newPatientAffiliateNumber, newPatientBirthDate, newPatientCoverage, newPatientDocument, newPatientEmail, newPatientName, newPatientPhone, newPatientPlan, newPatientSex]);

  const sendWhatsappInvite = useCallback(() => {
    const normalized = invitePhone.replace(/\D/g, "");
    if (!normalized) {
      setError("Ingresá un número para enviar la invitación.");
      return;
    }
    const text = encodeURIComponent(buildWhatsappInviteMessage());
    window.open(`https://wa.me/${normalized}?text=${text}`, "_blank");
  }, [invitePhone]);

  const parseQrPayload = useCallback((raw: string) => {
    const parsed = parseQrPatientData(raw);
    if (parsed.name) setNewPatientName(parsed.name);
    if (parsed.document) setNewPatientDocument(parsed.document);
    if (parsed.birthDate) setNewPatientBirthDate(parsed.birthDate);
    if (parsed.sex) setNewPatientSex(parsed.sex);
    if (parsed.coverage) setNewPatientCoverage(parsed.coverage);
    if (parsed.affiliateNumber) setNewPatientAffiliateNumber(parsed.affiliateNumber);
    if (parsed.plan) setNewPatientPlan(parsed.plan);
    if (parsed.phone) setNewPatientPhone(parsed.phone);
    if (parsed.email) setNewPatientEmail(parsed.email);
    if (parsed.address) setNewPatientAddress(parsed.address);
  }, []);

  const startQrScanner = useCallback(async () => {
    stopQrScanner();
    if (!navigator.mediaDevices?.getUserMedia) {
      setQrStatus("Tu navegador no soporta cámara.");
      return;
    }
    const BarcodeDetectorImpl = (window as Window & { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;
    if (!BarcodeDetectorImpl) {
      setQrStatus("Tu navegador no soporta lectura QR en vivo. Podés pegar el código manualmente.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      qrStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setQrStatus("Escaneando QR...");
      const detector = new BarcodeDetectorImpl({ formats: ["qr_code"] });
      qrScanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          const code = barcodes[0]?.rawValue;
          if (!code) return;
          setQrRawValue(code);
          parseQrPayload(code);
          setQrStatus("QR detectado. Revisá los datos y guardá.");
          setAddPatientOption("manual");
          stopQrScanner();
        } catch {
          // keep scanning
        }
      }, 500);
    } catch (err) {
      setQrStatus(err instanceof Error ? err.message : "No se pudo iniciar el escáner.");
    }
  }, [parseQrPayload, stopQrScanner]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  useEffect(() => {
    return () => stopAudioMeter();
  }, [stopAudioMeter]);

  useEffect(() => {
    return () => stopQrScanner();
  }, [stopQrScanner]);

  useEffect(() => {
    if (isPatientModalOpen && patientModalView === "add" && addPatientOption === "qr") {
      startQrScanner();
      return;
    }
    stopQrScanner();
  }, [addPatientOption, isPatientModalOpen, patientModalView, startQrScanner, stopQrScanner]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const filteredPatients = patients.filter((p) =>
    `${p.name} ${p.document ?? ""} ${p.affiliateNumber ?? ""} ${p.coverage ?? ""}`
      .toLowerCase()
      .includes(patientSearch.toLowerCase())
  );

  return (
    <div
      className="min-h-[calc(100vh-3.5rem)] bg-rene-aqua flex flex-col items-center justify-center p-6"
      style={{
        minHeight: "calc(100vh - 3.5rem)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        className="w-full max-w-md flex flex-col items-center gap-8"
        style={{ width: "100%", maxWidth: "28rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem" }}
      >
        <h1 className="text-2xl font-semibold text-gray-800" style={{ fontSize: "1.5rem", fontWeight: 600, color: "#1f2937", margin: 0 }}>
          {state === "recording"
            ? "Grabando consulta"
            : state === "processing"
              ? "Procesando consulta"
              : ""}
        </h1>

        <div className="w-full relative">
          <button
            type="button"
            disabled={state === "processing"}
            onClick={() => {
              setPatientModalView("choose");
              setIsPatientModalOpen((prev) => !prev);
              setError(null);
            }}
            className="w-full rounded-xl border border-rene-aquaDark bg-white/75 px-4 py-2 text-sm text-gray-700 text-center hover:bg-white transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {selectedPatient ? (
              <p className="font-medium text-gray-800">
                {selectedPatient.name}
                {selectedPatient.document ? ` · DNI: ${selectedPatient.document}` : ""}
                {selectedPatient.coverage ? ` · ${selectedPatient.coverage}` : ""}
              </p>
            ) : (
              <p className="font-medium text-gray-500">Seleccionar Paciente</p>
            )}
          </button>

          <PatientManagementModal
            isOpen={isPatientModalOpen}
            onClose={() => {
              setIsPatientModalOpen(false);
              stopQrScanner();
            }}
            patientModalView={patientModalView}
            setPatientModalView={setPatientModalView}
            addPatientOption={addPatientOption}
            setAddPatientOption={setAddPatientOption}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            isLoadingPatients={isLoadingPatients}
            filteredPatients={filteredPatients}
            selectedPatient={selectedPatient}
            onSelectPatient={(patient) => {
              setSelectedPatient(patient);
              setIsPatientModalOpen(false);
              setError(null);
            }}
            newPatientName={newPatientName}
            setNewPatientName={setNewPatientName}
            newPatientDocument={newPatientDocument}
            setNewPatientDocument={setNewPatientDocument}
            newPatientBirthDate={newPatientBirthDate}
            setNewPatientBirthDate={setNewPatientBirthDate}
            newPatientSex={newPatientSex}
            setNewPatientSex={setNewPatientSex}
            newPatientCoverage={newPatientCoverage}
            setNewPatientCoverage={setNewPatientCoverage}
            newPatientAffiliateNumber={newPatientAffiliateNumber}
            setNewPatientAffiliateNumber={setNewPatientAffiliateNumber}
            newPatientPlan={newPatientPlan}
            setNewPatientPlan={setNewPatientPlan}
            newPatientPhone={newPatientPhone}
            setNewPatientPhone={setNewPatientPhone}
            newPatientEmail={newPatientEmail}
            setNewPatientEmail={setNewPatientEmail}
            newPatientAddress={newPatientAddress}
            setNewPatientAddress={setNewPatientAddress}
            invitePhone={invitePhone}
            setInvitePhone={setInvitePhone}
            qrRawValue={qrRawValue}
            setQrRawValue={setQrRawValue}
            qrStatus={qrStatus}
            videoRef={videoRef}
            onParseQrPayload={parseQrPayload}
            onSendWhatsappInvite={sendWhatsappInvite}
            onCreatePatient={createPatient}
            isCreatingPatient={isCreatingPatient}
          />
        </div>

        {sessionVisitLoading && (
          <p className="text-xs text-teal-900 text-center w-full">Creando sesión de visita…</p>
        )}
        {sessionVisitError && (
          <div className="w-full text-xs text-red-600 text-center flex flex-col gap-1 items-center">
            <span>{sessionVisitError}</span>
            <button
              type="button"
              onClick={() => void retrySessionVisit()}
              className="text-teal-700 font-medium underline"
            >
              Reintentar
            </button>
          </div>
        )}
        <button
          type="button"
          disabled={!selectedPatient || sessionVisitLoading || !sessionVisitId}
          onClick={() => setComplementaryModalOpen(true)}
          className="w-full rounded-xl border border-teal-500 bg-white/90 px-4 py-2.5 text-sm font-medium text-teal-800 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          Analizar estudios complementarios
        </button>
        <ComplementaryStudiesFlow
          open={complementaryModalOpen}
          onClose={() => setComplementaryModalOpen(false)}
          visitId={sessionVisitId}
          visitLoading={sessionVisitLoading}
          patient={selectedPatient}
          onAddedToConsultation={() => {
            if (sessionVisitId) void loadVisitDetail(sessionVisitId);
          }}
        />

        <div className="w-full aspect-video max-h-32 bg-rene-aquaDark/50 rounded-xl flex items-center justify-center overflow-hidden">
          {state === "recording" && (
            <WaveformAnimation level={audioLevel} isActive={hasAudioSignal} />
          )}
          {state === "processing" && (
            <div className="flex gap-2">
              <span className="w-2 h-8 bg-rene-greenDark rounded animate-pulse" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-8 bg-rene-greenDark rounded animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-8 bg-rene-greenDark rounded animate-pulse" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>

        <div className="text-3xl font-mono text-gray-700 tabular-nums" style={{ fontSize: "1.875rem", fontFamily: "monospace", color: "#374151" }}>
          {formatTime(timer)}
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}

        <button
          type="button"
          onClick={state === "recording" ? stopRecording : startRecording}
          disabled={
            state === "processing" ||
            !selectedPatient ||
            sessionVisitLoading ||
            !sessionVisitId ||
            !!sessionVisitError
          }
          style={{
            width: "6rem",
            height: "6rem",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 500,
            border: "none",
            cursor:
              state === "processing" ||
              !selectedPatient ||
              sessionVisitLoading ||
              !sessionVisitId ||
              sessionVisitError
                ? "not-allowed"
                : "pointer",
            backgroundColor:
              state === "recording"
                ? "#0f766e"
                : state === "processing" ||
                    !selectedPatient ||
                    sessionVisitLoading ||
                    !sessionVisitId ||
                    sessionVisitError
                  ? "#7bcfc5"
                  : "#2dd4bf",
          }}
          className={`shadow-lg transition touch-manipulation ${
            state === "recording"
              ? "bg-rene-greenDark hover:bg-rene-greenDark"
              : state === "processing" ||
                  !selectedPatient ||
                  sessionVisitLoading ||
                  !sessionVisitId ||
                  sessionVisitError
                ? "bg-rene-aquaDark cursor-not-allowed"
                : "bg-rene-green hover:bg-rene-greenDark"
          }`}
        >
          {state === "recording" ? (
            <span className="w-8 h-8 rounded bg-white" />
          ) : state === "processing" ? (
            <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[36px] border-b-white ml-1" />
          )}
        </button>

        <p className="text-sm text-gray-600 text-center min-h-[1.25rem]" style={{ fontSize: "0.875rem", color: "#4b5563", margin: 0 }}>
          {state === "idle" &&
            (selectedPatient
              ? sessionVisitLoading
                ? "Preparando sesión de visita…"
                : sessionVisitError
                  ? "Reintentá la sesión de visita para grabar"
                  : !sessionVisitId
                    ? "Preparando sesión…"
                    : "Tocá para grabar"
              : "Seleccioná paciente para grabar")}
          {state === "recording" && "Tocá para detener"}
          {state === "processing" && processing.active && (
            <span className="font-medium text-gray-700">{getRecorderFooterStatus(processing)}</span>
          )}
        </p>
      </div>

    </div>
  );
}
