"use client";

import { useState } from "react";
import { AudioPlayer } from "./AudioPlayer";
import { NotesLeftPanel } from "./NotesLeftPanel";
import { MedicalActionsPanel } from "./MedicalActionsPanel";

interface VisitDetailProps {
  visit: {
    id: string;
    patient: { id: string; name: string };
    soap: { subjective: string; objective: string; assessment: string; plan: string } | null;
    transcript: { segments: Array<{ speaker: string; timestampStart: number; timestampEnd: number; text: string }> } | null;
    prescriptions: Array<{ drug: string; dose: string; frequency: string; route: string; duration: string }>;
    medicalOrders: Array<{ type: string; description: string }>;
    patientSummary: string | null;
    referral?: { text: string; specialist?: string };
    justification?: { text: string };
    signedAt?: string;
  };
  onClose: () => void;
}

export function VisitDetail({ visit }: VisitDetailProps) {
  const [soap, setSoap] = useState(visit.soap ?? {
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [signed, setSigned] = useState(!!visit.signedAt);
  const [signing, setSigning] = useState(false);

  const handleSave = () => {
    fetch(`/api/visits/${visit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soap }),
    }).catch(() => {});
  };

  const handleCopyWhatsApp = () => {
    const text = visit.patientSummary ?? "";
    navigator.clipboard.writeText(text);
  };

  const handleSign = () => {
    if (signed) return;
    setSigning(true);
    fetch(`/api/visits/${visit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sign: true }),
    })
      .then(() => setSigned(true))
      .finally(() => setSigning(false));
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 p-4 border-b border-rene-aquaDark/60 bg-white shrink-0 flex-wrap sm:flex-nowrap">
        <div className="min-w-0">
          <h2 className="font-semibold text-lg">{visit.patient.name}</h2>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString("es-AR")}
            {visit.signedAt && " • Firmada"}
          </p>
        </div>
        <AudioPlayer visitId={visit.id} />
        <div className="flex gap-2 items-center shrink-0">
          <button
            onClick={handleCopyWhatsApp}
            className="px-3 py-1.5 text-sm bg-rene-aquaDark/50 text-rene-greenDark rounded-lg hover:bg-rene-aquaDark"
          >
            Copiar para WhatsApp
          </button>
          {!signed && (
            <button
              onClick={handleSign}
              disabled={signing}
              className="px-4 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {signing ? "Firmando…" : "Firmar"}
            </button>
          )}
          {signed && (
            <span className="text-sm text-rene-green font-medium">Firmada</span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-4">
        <div className="flex gap-4 min-h-0 flex-1 flex-col lg:flex-row" style={{ minHeight: "320px" }}>
          <div className="w-full lg:w-1/2 flex flex-col min-h-0">
            <div className="flex-1 min-h-0">
              <NotesLeftPanel
                soap={soap}
                onSoapChange={setSoap}
                onSave={handleSave}
                transcript={visit.transcript}
              />
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex flex-col min-h-0">
            <h3 className="font-medium mb-2 text-sm text-gray-600">Acciones médicas</h3>
            <div className="flex-1 min-h-0">
              <MedicalActionsPanel
                prescriptions={visit.prescriptions}
                medicalOrders={visit.medicalOrders}
                patientSummary={visit.patientSummary}
                referral={visit.referral}
                justification={visit.justification}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
