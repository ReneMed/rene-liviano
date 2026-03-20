"use client";

import { useEffect, useState } from "react";
import { NotesLeftPanel } from "./NotesLeftPanel";
import { MedicalActionsPanel } from "./MedicalActionsPanel";
import type { MedicalActionsTabId } from "./MedicalActionsPanel";
import { useConsultationStore } from "@/shared/store/useConsultationStore";
import type { VisitDetail as VisitDetailModel, VisitPatient } from "@shared-types";
import { Modal } from "@/shared/ui/Modal";

const SOAP_BLOCK_ORDER = ["subjective", "objective", "assessment", "plan"] as const;

/** Velocidad de la animación tipo escritura (bloques en orden fijo). */
const TYPEWRITER_INTERVAL_MS = 22;
const TYPEWRITER_CHARS_PER_TICK = 14;

interface VisitDetailProps {
  visit: VisitDetailModel;
  onClose: () => void;
  initialActionsTab?: MedicalActionsTabId;
}

type PatientApi = VisitPatient;

function formatField(v: string | null | undefined) {
  if (v == null || String(v).trim() === "") return "—";
  return String(v);
}

function formatBirthDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("es-AR");
  } catch {
    return "—";
  }
}

function PatientDetailBody({ patient }: { patient: PatientApi | null }) {
  if (!patient) {
    return <p className="text-sm text-gray-500">Sin datos del paciente.</p>;
  }

  const rows: Array<{ label: string; value: string }> = [
    { label: "Nombre", value: formatField(patient.name) },
    { label: "Fecha de nacimiento", value: formatBirthDate(patient.birthDate ?? undefined) },
    { label: "Documento", value: formatField(patient.document) },
    { label: "Sexo", value: formatField(patient.sex) },
    { label: "Cobertura", value: formatField(patient.coverage) },
    { label: "Nº afiliado", value: formatField(patient.affiliateNumber) },
    { label: "Plan", value: formatField(patient.plan) },
    { label: "Teléfono", value: formatField(patient.phone) },
    { label: "Email", value: formatField(patient.email) },
    { label: "Dirección", value: formatField(patient.address) },
  ];

  return (
    <dl className="space-y-3 text-sm">
      {rows.map(({ label, value }) => (
        <div key={label} className="grid grid-cols-[minmax(0,8.5rem)_1fr] gap-x-3 gap-y-1">
          <dt className="text-gray-500 shrink-0">{label}</dt>
          <dd className="text-gray-900 font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function VisitDetail({ visit, initialActionsTab }: VisitDetailProps) {
  const { processing, clearProcessing } = useConsultationStore();
  const [soap, setSoap] = useState(visit.soap ?? {
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [animatedSoap, setAnimatedSoap] = useState(visit.soap ?? {
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });

  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [modalPatient, setModalPatient] = useState<PatientApi | null>(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);

  useEffect(() => {
    setSoap(
      visit.soap ?? {
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
      }
    );
  }, [visit.id, visit.soap]);

  useEffect(() => {
    if (!patientModalOpen || !visit.patient.id) return;

    setPatientError(null);
    setPatientLoading(true);
    setModalPatient(null);

    const ac = new AbortController();
    fetch(`/api/patients/${visit.patient.id}`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "No se pudieron cargar los datos");
        }
        return res.json() as Promise<PatientApi>;
      })
      .then(setModalPatient)
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setPatientError(e.message ?? "Error al cargar");
      })
      .finally(() => setPatientLoading(false));

    return () => ac.abort();
  }, [patientModalOpen, visit.patient.id]);

  useEffect(() => {
    if (!processing.active || !visit.soap) {
      setAnimatedSoap(
        visit.soap ?? {
          subjective: "",
          objective: "",
          assessment: "",
          plan: "",
        }
      );
      return;
    }

    const interval = setInterval(() => {
      setAnimatedSoap((prev) => {
        const next = { ...prev };
        for (const key of SOAP_BLOCK_ORDER) {
          const target = visit.soap?.[key] ?? "";
          const current = prev[key] ?? "";
          if (current.length < target.length) {
            next[key] = target.slice(
              0,
              current.length + TYPEWRITER_CHARS_PER_TICK
            );
            return next;
          }
        }
        return prev;
      });
    }, TYPEWRITER_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [processing.active, visit.soap]);

  useEffect(() => {
    if (!processing.active || !visit.soap) return;

    const done = SOAP_BLOCK_ORDER.every(
      (key) => (animatedSoap[key] ?? "").length >= (visit.soap?.[key] ?? "").length
    );
    if (!done) return;

    const timeout = setTimeout(() => {
      clearProcessing();
    }, 280);

    return () => clearTimeout(timeout);
  }, [animatedSoap, clearProcessing, processing.active, visit.soap]);

  const handleSave = () => {
    fetch(`/api/visits/${visit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soap }),
    }).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-3 py-2 border-b border-rene-aquaDark/50 bg-rene-aqua/35 shrink-0">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight text-gray-900">
            <button
              type="button"
              disabled={!visit.patient.id}
              onClick={() => setPatientModalOpen(true)}
              className="text-left rounded px-0.5 -mx-0.5 hover:underline hover:text-rene-greenDark focus:outline-none focus-visible:ring-2 focus-visible:ring-rene-green focus-visible:ring-offset-1 disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
            >
              {visit.patient.name}
            </button>
          </h2>
          <p className="text-xs text-gray-600 leading-tight mt-0.5">
            {new Date().toLocaleDateString("es-AR")}
            {visit.signedAt && " • Firmada"}
          </p>
        </div>
      </header>

      <Modal
        isOpen={patientModalOpen}
        onClose={() => setPatientModalOpen(false)}
        title="Datos del paciente"
      >
        {patientLoading && !modalPatient ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : patientError ? (
          <p className="text-sm text-red-600">{patientError}</p>
        ) : (
          <PatientDetailBody patient={modalPatient} />
        )}
      </Modal>

      <div className="flex-1 overflow-hidden p-4">
        <div className="flex gap-4 min-h-0 flex-1 flex-col lg:flex-row" style={{ minHeight: "320px" }}>
          <div className="w-full lg:w-1/2 flex flex-col min-h-0">
            <div className="flex-1 min-h-0">
              <NotesLeftPanel
                key={visit.id}
                soap={processing.active ? animatedSoap : soap}
                onSoapChange={setSoap}
                onSave={handleSave}
                transcript={visit.transcript}
                extractedStudies={visit.extractedActions.studies}
                analysisReadings={visit.analysisReadings ?? []}
                isProcessing={processing.active}
                processingStage={processing.stage}
              />
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex flex-col lg:self-start">
            <MedicalActionsPanel
              extractedActions={visit.extractedActions}
              patientSummary={visit.patientSummary}
              initialTab={initialActionsTab}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
