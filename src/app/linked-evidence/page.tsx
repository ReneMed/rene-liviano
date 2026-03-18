"use client";

import { Suspense } from "react";
import { AppLayout } from "@/shared/components/AppLayout";
import { LinkedEvidenceViewer } from "@/features/linked-evidence/LinkedEvidenceViewer";

export default function LinkedEvidencePage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="min-h-full flex items-center justify-center py-20">Cargando…</div>}>
        <LinkedEvidenceViewer />
      </Suspense>
    </AppLayout>
  );
}
