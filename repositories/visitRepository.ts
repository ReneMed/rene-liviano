import { prisma } from "@/lib/prisma";
import type { IVisitRepository, VisitEntity } from "../src/domain/repositories";

export function createVisitRepository(): IVisitRepository {
  return {
    async create(data) {
      const visit = await prisma.visit.create({
        data: { patientId: data.patientId, professionalId: data.professionalId },
      });
      return {
        id: visit.id,
        patientId: visit.patientId,
        professionalId: visit.professionalId,
        signedAt: visit.signedAt ?? undefined,
      };
    },
    async findById(id) {
      const visit = await prisma.visit.findUnique({ where: { id } });
      if (!visit) return null;
      return {
        id: visit.id,
        patientId: visit.patientId,
        professionalId: visit.professionalId,
        signedAt: visit.signedAt ?? undefined,
      };
    },
    async findByPatientId(patientId) {
      const visits = await prisma.visit.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
      });
      return visits.map((v) => ({
        id: v.id,
        patientId: v.patientId,
        professionalId: v.professionalId,
        signedAt: v.signedAt ?? undefined,
      }));
    },
    async sign(visitId) {
      await prisma.visit.update({
        where: { id: visitId },
        data: { signedAt: new Date() },
      });
    },
  };
}
