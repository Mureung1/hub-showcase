import { z } from "zod";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import type {
  ActiveHospitalAccess,
  HospitalAccessRepository,
} from "../hospitalAccessRepository.js";

const accessRowSchema = z.object({
  account_id: z.uuid(),
  hospital_id: z.uuid(),
});

export class PgHospitalAccessRepository implements HospitalAccessRepository {
  async findActiveByAccountId(
    executor: DatabaseExecutor,
    accountId: string,
  ): Promise<ActiveHospitalAccess | null> {
    const result = await executor.query(
      `
        SELECT member.account_id, member.hospital_id
        FROM public.hospital_members AS member
        JOIN public.profiles AS profile ON profile.id = member.account_id
        JOIN public.hospitals AS hospital ON hospital.id = member.hospital_id
        WHERE member.account_id = $1
          AND member.status = 'active'
          AND profile.account_type = 'hospital_admin'
          AND profile.status = 'active'
          AND hospital.approval_status = 'approved'
        ORDER BY member.created_at ASC
        LIMIT 1
      `,
      [accountId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const access = accessRowSchema.parse(row);
    return { accountId: access.account_id, hospitalId: access.hospital_id };
  }
}
