"use client";

import { useState } from "react";
import { EstudiosOrdenesSection } from "./EstudiosOrdenesSection";

type TabId = "estudios" | "resumen" | "derivacion" | "justificacion";

interface MedicalActionsPanelProps {
  prescriptions: Array<{ drug: string; dose: string; frequency: string; route: string; duration: string }>;
  medicalOrders: Array<{ type: string; description: string }>;
  patientSummary: string | null;
  referral?: { text: string; specialist?: string };
  justification?: { text: string };
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "estudios", label: "Estudios / Órdenes" },
  { id: "resumen", label: "Resumen paciente" },
  { id: "derivacion", label: "Carta de derivación" },
  { id: "justificacion", label: "Justificación obra social" },
];

export function MedicalActionsPanel({
  prescriptions,
  medicalOrders,
  patientSummary,
  referral,
  justification,
}: MedicalActionsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("estudios");

  return (
    <div className="bg-white border border-rene-aquaDark/40 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="flex border-b border-rene-aquaDark/40 shrink-0 overflow-x-auto">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${
              activeTab === id
                ? "border-rene-green text-rene-green"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4 min-h-0">
        {activeTab === "estudios" && (
          <EstudiosOrdenesSection
            prescriptions={prescriptions}
            medicalOrders={medicalOrders}
          />
        )}
        {activeTab === "resumen" && (
          <div className="text-sm whitespace-pre-wrap">
            {patientSummary || <p className="text-gray-500">Sin resumen.</p>}
          </div>
        )}
        {activeTab === "derivacion" && (
          <div className="text-sm whitespace-pre-wrap">
            {referral?.text || <p className="text-gray-500">Sin carta de derivación.</p>}
            {referral?.specialist && (
              <p className="mt-2 text-gray-600">Especialista: {referral.specialist}</p>
            )}
          </div>
        )}
        {activeTab === "justificacion" && (
          <div className="text-sm whitespace-pre-wrap">
            {justification?.text || <p className="text-gray-500">Sin justificación.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
