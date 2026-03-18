import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfessional } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const professional = await getCurrentProfessional();
    if (!professional) {
      return NextResponse.json({ success: false, consultations_today: 0, total_patients: 0 }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [consultationsToday, totalPatients] = await Promise.all([
      prisma.visit.count({
        where: {
          professionalId: professional.id,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.patient.count({
        where: { professionalId: professional.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      consultations_today: consultationsToday,
      total_patients: totalPatients,
    });
  } catch (err) {
    console.error("GET panel-stats error:", err);
    return NextResponse.json(
      { success: false, consultations_today: 0, total_patients: 0 },
      { status: 500 }
    );
  }
}
