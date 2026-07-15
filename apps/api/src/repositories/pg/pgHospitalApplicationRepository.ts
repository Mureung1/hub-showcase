import {
  hospitalApplicationStatusSchema,
  hospitalDocumentScanStatusSchema,
  hospitalDocumentTypeSchema,
  hospitalVerificationProviderSchema,
} from "@baro-jinryo/shared";
import { z } from "zod";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import type {
  CreateHospitalApplicationInput,
  CreateHospitalDocumentInput,
  HospitalApplication,
  HospitalApplicationRepository,
  HospitalDocument,
} from "../hospitalApplicationRepository.js";

const applicationRowSchema = z.object({
  id: z.uuid(),
  hospital_id: z.uuid(),
  applicant_account_id: z.uuid(),
  business_registration_number: z.string(),
  care_institution_code: z.string(),
  representative_name: z.string(),
  business_open_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: hospitalApplicationStatusSchema,
  verification_provider: hospitalVerificationProviderSchema,
  verification_result: z.record(z.string(), z.unknown()),
  reviewed_by: z.uuid().nullable(),
  submitted_at: z.date(),
  reviewed_at: z.date().nullable(),
});

const documentRowSchema = z.object({
  id: z.uuid(),
  application_id: z.uuid(),
  document_type: hospitalDocumentTypeSchema,
  storage_key: z.string(),
  mime_type: z.string(),
  file_size_bytes: z.number().int().positive(),
  scan_status: hospitalDocumentScanStatusSchema,
  created_at: z.date(),
});

type ApplicationRow = z.infer<typeof applicationRowSchema>;
type DocumentRow = z.infer<typeof documentRowSchema>;

const applicationColumns = `
  id, hospital_id, applicant_account_id, business_registration_number,
  care_institution_code, representative_name, business_open_date, status,
  verification_provider, verification_result, reviewed_by, submitted_at, reviewed_at
`;

function toApplication(row: unknown): HospitalApplication {
  const application = applicationRowSchema.parse(row);
  return {
    id: application.id,
    hospitalId: application.hospital_id,
    applicantAccountId: application.applicant_account_id,
    businessRegistrationNumber: application.business_registration_number,
    careInstitutionCode: application.care_institution_code,
    representativeName: application.representative_name,
    businessOpenDate: application.business_open_date,
    status: application.status,
    verificationProvider: application.verification_provider,
    verificationResult: application.verification_result,
    reviewedBy: application.reviewed_by,
    submittedAt: application.submitted_at,
    reviewedAt: application.reviewed_at,
  };
}

function toDocument(row: unknown): HospitalDocument {
  const document = documentRowSchema.parse(row);
  return {
    id: document.id,
    applicationId: document.application_id,
    documentType: document.document_type,
    storageKey: document.storage_key,
    mimeType: document.mime_type,
    fileSizeBytes: document.file_size_bytes,
    scanStatus: document.scan_status,
    createdAt: document.created_at,
  };
}

export class PgHospitalApplicationRepository implements HospitalApplicationRepository {
  async findById(executor: DatabaseExecutor, id: string): Promise<HospitalApplication | null> {
    const result = await executor.query<ApplicationRow>(
      `SELECT ${applicationColumns} FROM public.hospital_applications WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toApplication(result.rows[0]) : null;
  }

  async findPendingByHospital(
    executor: DatabaseExecutor,
    hospitalId: string,
  ): Promise<HospitalApplication | null> {
    const result = await executor.query<ApplicationRow>(
      `
        SELECT ${applicationColumns}
        FROM public.hospital_applications
        WHERE hospital_id = $1 AND status = 'pending'
        LIMIT 1
      `,
      [hospitalId],
    );
    return result.rows[0] ? toApplication(result.rows[0]) : null;
  }

  async listPending(executor: DatabaseExecutor): Promise<HospitalApplication[]> {
    const result = await executor.query<ApplicationRow>(
      `
        SELECT ${applicationColumns}
        FROM public.hospital_applications
        WHERE status = 'pending'
        ORDER BY submitted_at ASC
      `,
    );
    return result.rows.map(toApplication);
  }

  async create(
    executor: DatabaseExecutor,
    input: CreateHospitalApplicationInput,
  ): Promise<HospitalApplication> {
    const result = await executor.query<ApplicationRow>(
      `
        INSERT INTO public.hospital_applications
          (hospital_id, applicant_account_id, business_registration_number,
           care_institution_code, representative_name, business_open_date,
           verification_provider, verification_result)
        VALUES ($1, $2, $3, $4, $5, $6, 'mock', $7)
        RETURNING ${applicationColumns}
      `,
      [
        input.hospitalId,
        input.applicantAccountId,
        input.businessRegistrationNumber,
        input.careInstitutionCode,
        input.representativeName,
        input.businessOpenDate,
        input.verificationResult,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("상세 신청 생성 결과를 찾을 수 없습니다.");
    return toApplication(row);
  }

  async createDocument(
    executor: DatabaseExecutor,
    input: CreateHospitalDocumentInput,
  ): Promise<HospitalDocument> {
    const result = await executor.query<DocumentRow>(
      `
        INSERT INTO public.hospital_documents
          (application_id, document_type, storage_key, mime_type, file_size_bytes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, application_id, document_type, storage_key, mime_type,
          file_size_bytes, scan_status, created_at
      `,
      [
        input.applicationId,
        input.documentType,
        input.storageKey,
        input.mimeType,
        input.fileSizeBytes,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("증빙 메타데이터 생성 결과를 찾을 수 없습니다.");
    return toDocument(row);
  }

  async review(
    executor: DatabaseExecutor,
    applicationId: string,
    status: "approved" | "rejected",
    reviewerAccountId: string,
  ): Promise<HospitalApplication | null> {
    const result = await executor.query<ApplicationRow>(
      `
        UPDATE public.hospital_applications
        SET status = $2, reviewed_by = $3, reviewed_at = now()
        WHERE id = $1 AND status = 'pending'
        RETURNING ${applicationColumns}
      `,
      [applicationId, status, reviewerAccountId],
    );
    return result.rows[0] ? toApplication(result.rows[0]) : null;
  }
}
