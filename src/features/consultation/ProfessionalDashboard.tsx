"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VisitDetail } from "./VisitDetail";
import { useConsultationStore } from "@/shared/store/useConsultationStore";

interface ProfessionalDashboardProps {
  initialVisitId?: string | null;
}

export function ProfessionalDashboard({ initialVisitId }: ProfessionalDashboardProps) {
  const { selectedVisit, setSelectedVisit } = useConsultationStore();
  const [loading, setLoading] = useState(!!initialVisitId);

  useEffect(() => {
    if (initialVisitId && !selectedVisit) {
      setLoading(true);
      fetch(`/api/visits/${initialVisitId}`)
        .then((r) => r.json())
        .then(setSelectedVisit)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [initialVisitId, selectedVisit, setSelectedVisit]);

  return (
    <div className="min-h-full flex" style={{ backgroundColor: "#f0fdfa" }}>
      <main className="flex-1 overflow-auto min-w-0">
        {selectedVisit ? (
          <VisitDetail visit={selectedVisit} onClose={() => setSelectedVisit(null)} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-gray-500 gap-4">
            {loading ? (
              <p>Cargando…</p>
            ) : (
              <>
                <p>No hay consulta seleccionada.</p>
                <Link href="/" className="text-rene-green hover:underline font-medium">
                  Ir a nueva grabación
                </Link>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
