import { e164PhoneNumberSchema, hospitalInquiryStatusSchema } from "@baro-jinryo/shared";
import { z } from "zod";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import type {
  CreateHospitalInquiryInput,
  HospitalInquiry,
  HospitalInquiryRepository,
} from "../hospitalInquiryRepository.js";

const inquiryRowSchema = z.object({
  id: z.uuid(),
  applicant_account_id: z.uuid(),
  hospital_id: z.uuid().nullable(),
  hospital_name: z.string(),
  primary_department: z.string(),
  phone_number: e164PhoneNumberSchema,
  region_sido: z.string(),
  region_sigungu: z.string(),
  address: z.string(),
  status: hospitalInquiryStatusSchema,
  reviewed_by: z.uuid().nullable(),
  submitted_at: z.date(),
  reviewed_at: z.date().nullable(),
});

type InquiryRow = z.infer<typeof inquiryRowSchema>;

const inquiryColumns = `
  id, applicant_account_id, hospital_id, hospital_name, primary_department,
  phone_number, region_sido, region_sigungu, address, status, reviewed_by,
  submitted_at, reviewed_at
`;

function toInquiry(row: unknown): HospitalInquiry {
  const inquiry = inquiryRowSchema.parse(row);
  return {
    id: inquiry.id,
    applicantAccountId: inquiry.applicant_account_id,
    hospitalId: inquiry.hospital_id,
    hospitalName: inquiry.hospital_name,
    primaryDepartment: inquiry.primary_department,
    phoneNumber: inquiry.phone_number,
    regionSido: inquiry.region_sido,
    regionSigungu: inquiry.region_sigungu,
    address: inquiry.address,
    status: inquiry.status,
    reviewedBy: inquiry.reviewed_by,
    submittedAt: inquiry.submitted_at,
    reviewedAt: inquiry.reviewed_at,
  };
}

export class PgHospitalInquiryRepository implements HospitalInquiryRepository {
  async findById(executor: DatabaseExecutor, id: string): Promise<HospitalInquiry | null> {
    const result = await executor.query<InquiryRow>(
      `SELECT ${inquiryColumns} FROM public.hospital_inquiries WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toInquiry(result.rows[0]) : null;
  }

  async findCurrentByApplicant(
    executor: DatabaseExecutor,
    applicantAccountId: string,
  ): Promise<HospitalInquiry | null> {
    const result = await executor.query<InquiryRow>(
      `
        SELECT ${inquiryColumns}
        FROM public.hospital_inquiries
        WHERE applicant_account_id = $1
        ORDER BY submitted_at DESC
        LIMIT 1
      `,
      [applicantAccountId],
    );
    return result.rows[0] ? toInquiry(result.rows[0]) : null;
  }

  async listSubmitted(executor: DatabaseExecutor): Promise<HospitalInquiry[]> {
    const result = await executor.query<InquiryRow>(
      `
        SELECT ${inquiryColumns}
        FROM public.hospital_inquiries
        WHERE status = 'submitted'
        ORDER BY submitted_at ASC
      `,
    );
    return result.rows.map(toInquiry);
  }

  async create(
    executor: DatabaseExecutor,
    input: CreateHospitalInquiryInput,
  ): Promise<HospitalInquiry> {
    const result = await executor.query<InquiryRow>(
      `
        INSERT INTO public.hospital_inquiries
          (applicant_account_id, hospital_name, primary_department, phone_number,
           region_sido, region_sigungu, address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${inquiryColumns}
      `,
      [
        input.applicantAccountId,
        input.hospitalName,
        input.primaryDepartment,
        input.phoneNumber,
        input.regionSido,
        input.regionSigungu,
        input.address,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("입점 문의 생성 결과를 찾을 수 없습니다.");
    return toInquiry(row);
  }

  async accept(
    executor: DatabaseExecutor,
    inquiryId: string,
    hospitalId: string,
    reviewerAccountId: string,
  ): Promise<HospitalInquiry | null> {
    return this.review(executor, inquiryId, "accepted", reviewerAccountId, hospitalId);
  }

  async reject(
    executor: DatabaseExecutor,
    inquiryId: string,
    reviewerAccountId: string,
  ): Promise<HospitalInquiry | null> {
    return this.review(executor, inquiryId, "rejected", reviewerAccountId, null);
  }

  private async review(
    executor: DatabaseExecutor,
    inquiryId: string,
    status: "accepted" | "rejected",
    reviewerAccountId: string,
    hospitalId: string | null,
  ): Promise<HospitalInquiry | null> {
    const result = await executor.query<InquiryRow>(
      `
        UPDATE public.hospital_inquiries
        SET status = $2, hospital_id = $3, reviewed_by = $4, reviewed_at = now()
        WHERE id = $1 AND status = 'submitted'
        RETURNING ${inquiryColumns}
      `,
      [inquiryId, status, hospitalId, reviewerAccountId],
    );
    return result.rows[0] ? toInquiry(result.rows[0]) : null;
  }
}
