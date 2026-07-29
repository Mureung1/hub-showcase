export type ReflectionSaveStatus =
  | "idle"
  | "queued"
  | "saving"
  | "saved"
  | "error";

export function canSubmitReflection(status: ReflectionSaveStatus): boolean {
  return status === "idle" || status === "error";
}

export function canSendReflection(
  status: ReflectionSaveStatus,
  isAnalysisComplete: boolean,
  answer: string,
): boolean {
  return (
    answer.trim().length > 0 &&
    (isAnalysisComplete
      ? canSubmitReflection(status)
      : status === "idle" || status === "error")
  );
}
