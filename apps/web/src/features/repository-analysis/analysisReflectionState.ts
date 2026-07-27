export type ReflectionSaveStatus =
  | "idle"
  | "queued"
  | "saving"
  | "saved"
  | "error";

export function canSubmitReflection(status: ReflectionSaveStatus): boolean {
  return status === "idle" || status === "error";
}
