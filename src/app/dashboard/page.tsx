"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/shared/components/AppLayout";
import { ProfessionalDashboard } from "@/features/consultation/ProfessionalDashboard";

function DashboardContent() {
  const searchParams = useSearchParams();
  const visitId = searchParams.get("visitId");

  return <ProfessionalDashboard initialVisitId={visitId} />;
}

export default function DashboardPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="min-h-full flex items-center justify-center py-20">Cargando…</div>}>
        <DashboardContent />
      </Suspense>
    </AppLayout>
  );
}
