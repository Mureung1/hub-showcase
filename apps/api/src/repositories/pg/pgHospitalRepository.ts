import {
  e164PhoneNumberSchema,
  hospitalApprovalStatusSchema,
  hospitalMemberRoleSchema,
  hospitalMemberStatusSchema,
} from "@baro-jinryo/shared";
import { z } from "zod";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import type {
  CreateHospitalInput,
  Hospital,
  HospitalMember,
  HospitalRepository,
} from "../hospitalRepository.js";

const hospitalRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  primary_department: z.string(),
  phone_number: e164PhoneNumberSchema,
  region_sido: z.string(),
  region_sigungu: z.string(),
  address: z.string(),
  latitude: z.coerce.number().nullable(),
  longitude: z.coerce.number().nullable(),
  operating_hours_text: z.string(),
  approval_status: hospitalApprovalStatusSchema,
  approved_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

const hospitalMemberRowSchema = z.object({
  id: z.uuid(),
  hospital_id: z.uuid(),
  account_id: z.uuid(),
  role: hospitalMemberRoleSchema,
  status: hospitalMemberStatusSchema,
  created_at: z.date(),
});

type HospitalRow = z.infer<typeof hospitalRowSchema>;
type HospitalMemberRow = z.infer<typeof hospitalMemberRowSchema>;

const hospitalColumns = `
  id, name, primary_department, phone_number, region_sido, region_sigungu,
  address, latitude, longitude, operating_hours_text, approval_status,
  approved_at, created_at, updated_at
`;

function toHospital(row: unknown): Hospital {
  const hospital = hospitalRowSchema.parse(row);
  return {
    id: hospital.id,
    name: hospital.name,
    primaryDepartment: hospital.primary_department,
    phoneNumber: hospital.phone_number,
    regionSido: hospital.region_sido,
    regionSigungu: hospital.region_sigungu,
    address: hospital.address,
    latitude: hospital.latitude,
    longitude: hospital.longitude,
    operatingHoursText: hospital.operating_hours_text,
    approvalStatus: hospital.approval_status,
    approvedAt: hospital.approved_at,
    createdAt: hospital.created_at,
    updatedAt: hospital.updated_at,
  };
}

function toHospitalMember(row: unknown): HospitalMember {
  const member = hospitalMemberRowSchema.parse(row);
  return {
    id: member.id,
    hospitalId: member.hospital_id,
    accountId: member.account_id,
    role: member.role,
    status: member.status,
    createdAt: member.created_at,
  };
}

export class PgHospitalRepository implements HospitalRepository {
  async findById(executor: DatabaseExecutor, id: string): Promise<Hospital | null> {
    const result = await executor.query<HospitalRow>(
      `SELECT ${hospitalColumns} FROM public.hospitals WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toHospital(result.rows[0]) : null;
  }

  async create(executor: DatabaseExecutor, input: CreateHospitalInput): Promise<Hospital> {
    const result = await executor.query<HospitalRow>(
      `
        INSERT INTO public.hospitals
          (name, primary_department, phone_number, region_sido, region_sigungu, address)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING ${hospitalColumns}
      `,
      [
        input.name,
        input.primaryDepartment,
        input.phoneNumber,
        input.regionSido,
        input.regionSigungu,
        input.address,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("병원 생성 결과를 찾을 수 없습니다.");
    return toHospital(row);
  }

  async createOwnerMembership(
    executor: DatabaseExecutor,
    hospitalId: string,
    accountId: string,
  ): Promise<HospitalMember> {
    const result = await executor.query<HospitalMemberRow>(
      `
        INSERT INTO public.hospital_members (hospital_id, account_id, role)
        VALUES ($1, $2, 'owner')
        RETURNING id, hospital_id, account_id, role, status, created_at
      `,
      [hospitalId, accountId],
    );
    const row = result.rows[0];
    if (!row) throw new Error("병원 소속 생성 결과를 찾을 수 없습니다.");
    return toHospitalMember(row);
  }

  async setApprovalStatus(
    executor: DatabaseExecutor,
    hospitalId: string,
    status: "approved" | "rejected",
  ): Promise<Hospital | null> {
    const result = await executor.query<HospitalRow>(
      `
        UPDATE public.hospitals
        SET approval_status = $2::varchar,
            approved_at = CASE WHEN $2::varchar = 'approved' THEN now() ELSE NULL END
        WHERE id = $1 AND approval_status IN ('pending', 'rejected')
        RETURNING ${hospitalColumns}
      `,
      [hospitalId, status],
    );
    return result.rows[0] ? toHospital(result.rows[0]) : null;
  }
}
