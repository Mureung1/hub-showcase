import { z } from "zod";

export const accountTypes = ["patient", "hospital_admin", "platform_admin"] as const;
export const accountTypeSchema = z.enum(accountTypes);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const accountStatuses = ["active", "suspended", "withdrawn"] as const;
export const accountStatusSchema = z.enum(accountStatuses);
export type AccountStatus = z.infer<typeof accountStatusSchema>;

export const hospitalApprovalStatuses = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;
export const hospitalApprovalStatusSchema = z.enum(hospitalApprovalStatuses);
export type HospitalApprovalStatus = z.infer<typeof hospitalApprovalStatusSchema>;

export const e164PhoneNumberSchema = z
  .string()
  .regex(/^\+[1-9][0-9]{7,14}$/, "E.164 형식의 전화번호여야 합니다.");

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

export const notificationTypes = [
  "remote_registered",
  "onsite_registered",
  "preparation",
  "entry_requested",
  "onsite_near_turn",
  "cancelled",
  "called",
] as const;
export const notificationTypeSchema = z.enum(notificationTypes);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationDeliveryStatuses = ["pending", "sent", "failed"] as const;
export const notificationDeliveryStatusSchema = z.enum(notificationDeliveryStatuses);
export type NotificationDeliveryStatus = z.infer<typeof notificationDeliveryStatusSchema>;

export const patientInputModes = ["categorized", "total_only"] as const;
export const patientInputModeSchema = z.enum(patientInputModes);
export type PatientInputMode = z.infer<typeof patientInputModeSchema>;

export const patientCategorySetStatuses = ["scheduled", "active", "retired"] as const;
export const patientCategorySetStatusSchema = z.enum(patientCategorySetStatuses);
export type PatientCategorySetStatus = z.infer<typeof patientCategorySetStatusSchema>;

export const patientCategoryDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(20),
  description: z.string().trim().max(50),
  sortOrder: z.int().min(0).max(4),
});

export type PatientCategoryDefinition = z.infer<typeof patientCategoryDefinitionSchema>;

export type PatientCounts = Record<string, number>;

export function calculatePatientCount(counts: PatientCounts): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

export const patientCountsSchema = z
  .record(z.string().min(1), z.int().min(0).max(9))
  .refine((counts) => calculatePatientCount(counts) >= 1, {
    message: "환자 수는 1명 이상이어야 합니다.",
  })
  .refine((counts) => calculatePatientCount(counts) <= 9, {
    message: "한 번에 최대 9명까지 접수할 수 있습니다.",
  });

export const patientInputConfigurationSchema = z
  .object({
    inputMode: patientInputModeSchema,
    categories: z.array(patientCategoryDefinitionSchema).max(5),
  })
  .superRefine(({ inputMode, categories }, context) => {
    if (inputMode === "categorized" && categories.length < 1) {
      context.addIssue({
        code: "custom",
        path: ["categories"],
        message: "분류형 입력에는 분류가 1개 이상 필요합니다.",
      });
    }
    if (inputMode === "total_only" && categories.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["categories"],
        message: "총인원 입력에는 분류를 사용할 수 없습니다.",
      });
    }

    const normalizedNames = categories.map(({ name }) => name.trim().toLocaleLowerCase("ko-KR"));
    if (new Set(normalizedNames).size !== normalizedNames.length) {
      context.addIssue({
        code: "custom",
        path: ["categories"],
        message: "같은 이름의 분류를 중복해서 사용할 수 없습니다.",
      });
    }
  });

export type PatientInputConfiguration = z.infer<typeof patientInputConfigurationSchema>;

export const patientRegistrationInputSchema = z.discriminatedUnion("inputMode", [
  z.object({ inputMode: z.literal("categorized"), patientCounts: patientCountsSchema }),
  z.object({ inputMode: z.literal("total_only"), totalCount: z.int().min(1).max(9) }),
]);

export type PatientRegistrationInput = z.infer<typeof patientRegistrationInputSchema>;

export function calculateRegistrationPatientCount(input: PatientRegistrationInput): number {
  return input.inputMode === "categorized"
    ? calculatePatientCount(input.patientCounts)
    : input.totalCount;
}
