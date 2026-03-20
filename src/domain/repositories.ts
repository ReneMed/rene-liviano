import type {
  TranscriptSegment,
  SOAPNote,
  Prescription,
  MedicalOrder,
  PatientSummary,
  AgentActivationDecision,
} from "@shared-types";

export interface PatientEntity {
  id: string;
  name: string;
  birthDate?: Date;
  document?: string;
}

export interface VisitEntity {
  id: string;
  patientId: string;
  professionalId: string;
  signedAt?: Date;
}

export interface TranscriptEntity {
  id: string;
  visitId: string;
  segments: TranscriptSegment[];
  audioUrl?: string;
}

export interface IPatientRepository {
  create(data: { name: string; birthDate?: Date; document?: string; professionalId: string }): Promise<PatientEntity>;
  findById(id: string): Promise<PatientEntity | null>;
}

export interface IVisitRepository {
  create(data: { patientId: string; professionalId: string }): Promise<VisitEntity>;
  findById(id: string): Promise<VisitEntity | null>;
  findByPatientId(patientId: string): Promise<VisitEntity[]>;
  sign(visitId: string): Promise<void>;
}

export interface ITranscriptRepository {
  create(data: {
    visitId: string;
    segments: TranscriptSegment[];
    audioUrl?: string;
  }): Promise<TranscriptEntity>;
  findByVisitId(visitId: string): Promise<TranscriptEntity | null>;
}

export interface INoteRepository {
  create(data: { visitId: string; soap: SOAPNote }): Promise<void>;
  update(data: { visitId: string; soap: SOAPNote }): Promise<void>;
  findByVisitId(visitId: string): Promise<SOAPNote | null>;
}

export interface IPrescriptionRepository {
  createMany(data: { visitId: string; prescriptions: Prescription[] }): Promise<void>;
  findByVisitId(visitId: string): Promise<Prescription[]>;
}

export interface IMedicalOrderRepository {
  createMany(data: { visitId: string; orders: MedicalOrder[] }): Promise<void>;
  findByVisitId(visitId: string): Promise<MedicalOrder[]>;
}

export interface IPatientSummaryRepository {
  create(data: { visitId: string; text: string }): Promise<void>;
  findByVisitId(visitId: string): Promise<PatientSummary | null>;
}

export interface IAgentDecisionRepository {
  createMany(data: { visitId: string; decisions: AgentActivationDecision[] }): Promise<void>;
}
