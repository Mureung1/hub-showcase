import {
  hospitalChangeRequestStatusSchema,
  hospitalInformationSchema,
} from "@baro-jinryo/shared";
import { z } from "zod";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import type {
  HospitalChangeRequest,
  HospitalChangeRequestRepository,
} from "../hospitalChangeRequestRepository.js";

const rowSchema = z.object({
  id: z.uuid(),
  hospital_id: z.uuid(),
  hospital_name: z.string(),
  requested_by: z.uuid(),
  status: hospitalChangeRequestStatusSchema,
  current_values: hospitalInformationSchema,
  proposed_values: hospitalInformationSchema,
  reviewed_by: z.uuid().nullable(),
  submitted_at: z.date(),
  reviewed_at: z.date().nullable(),
});

const columns = `
  request.id, request.hospital_id, hospital.name AS hospital_name,
  request.requested_by, request.status, request.current_values,
  request.proposed_values, request.reviewed_by, request.submitted_at, request.reviewed_at
`;

function toChangeRequest(value: unknown): HospitalChangeRequest {
  const row = rowSchema.parse(value);
  return {
    id: row.id,
    hospitalId: row.hospital_id,
    hospitalName: row.hospital_name,
    requestedBy: row.requested_by,
    status: row.status,
    currentValues: row.current_values,
    proposedValues: row.proposed_values,
    reviewedBy: row.reviewed_by,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
  };
}

export class PgHospitalChangeRequestRepository implements HospitalChangeRequestRepository {
  async findPendingByHospitalId(executor: DatabaseExecutor, hospitalId: string) {
    const result = await executor.query(
      `SELECT ${columns}
       FROM public.hospital_change_requests AS request
       JOIN public.hospitals AS hospital ON hospital.id = request.hospital_id
       WHERE request.hospital_id = $1 AND request.status = 'pending'`,
      [hospitalId],
    );
    return result.rows[0] ? toChangeRequest(result.rows[0]) : null;
  }

  async list(executor: DatabaseExecutor) {
    const result = await executor.query(
      `SELECT ${columns}
       FROM public.hospital_change_requests AS request
       JOIN public.hospitals AS hospital ON hospital.id = request.hospital_id
       ORDER BY CASE WHEN request.status = 'pending' THEN 0 ELSE 1 END,
                request.submitted_at DESC`,
    );
    return result.rows.map(toChangeRequest);
  }

  async findByIdForUpdate(executor: DatabaseExecutor, id: string) {
    const result = await executor.query(
      `SELECT ${columns}
       FROM public.hospital_change_requests AS request
       JOIN public.hospitals AS hospital ON hospital.id = request.hospital_id
       WHERE request.id = $1
       FOR UPDATE OF request`,
      [id],
    );
    return result.rows[0] ? toChangeRequest(result.rows[0]) : null;
  }

  async create(
    executor: DatabaseExecutor,
    input: {
      hospitalId: string;
      requestedBy: string;
      currentValues: HospitalChangeRequest["currentValues"];
      proposedValues: HospitalChangeRequest["proposedValues"];
    },
  ) {
    const result = await executor.query(
      `INSERT INTO public.hospital_change_requests
         (hospital_id, requested_by, current_values, proposed_values)
       VALUES ($1, $2, $3::jsonb, $4::jsonb)
       RETURNING id`,
      [
        input.hospitalId,
        input.requestedBy,
        JSON.stringify(input.currentValues),
        JSON.stringify(input.proposedValues),
      ],
    );
    const id = z.object({ id: z.uuid() }).parse(result.rows[0]).id;
    const created = await this.findByIdForUpdate(executor, id);
    if (!created) throw new Error("병원 정보 변경 요청 생성 결과를 찾을 수 없습니다.");
    return created;
  }

  async review(
    executor: DatabaseExecutor,
    id: string,
    status: "approved" | "rejected",
    reviewerId: string,
  ) {
    const result = await executor.query(
      `UPDATE public.hospital_change_requests
       SET status = $2, reviewed_by = $3, reviewed_at = now()
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [id, status, reviewerId],
    );
    if (!result.rows[0]) return null;
    return this.findByIdForUpdate(executor, id);
  }
}
