import { z } from "zod";

export const accountTypes = ["patient", "hospital_admin", "platform_admin"] as const;
export const accountTypeSchema = z.enum(accountTypes);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const queueStatuses = ["open", "paused", "closed"] as const;
export const queueStatusSchema = z.enum(queueStatuses);
export type QueueStatus = z.infer<typeof queueStatusSchema>;

export const waitingSources = ["remote", "onsite"] as const;
export const waitingSourceSchema = z.enum(waitingSources);
export type WaitingSource = z.infer<typeof waitingSourceSchema>;

export const waitingStatuses = [
  "remote_waiting",
  "entry_requested",
  "onsite_waiting",
  "held",
  "called",
  "cancelled",
] as const;
export const waitingStatusSchema = z.enum(waitingStatuses);
export type WaitingStatus = z.infer<typeof waitingStatusSchema>;

export const patientCountsSchema = z
  .object({
    child: z.int().min(0).max(9),
    adult: z.int().min(0).max(9),
    senior: z.int().min(0).max(9),
  })
  .refine(({ child, adult, senior }) => child + adult + senior >= 1, {
    message: "환자 수는 1명 이상이어야 합니다.",
  })
  .refine(({ child, adult, senior }) => child + adult + senior <= 9, {
    message: "한 번에 최대 9명까지 접수할 수 있습니다.",
  });

export type PatientCounts = z.infer<typeof patientCountsSchema>;

export function calculatePatientCount(counts: PatientCounts): number {
  return counts.child + counts.adult + counts.senior;
}
