export type BlinkEntryReason = "onboarding_completed" | "stored_profile_refresh" | "service_exit" | "journal_opened" | "journal_closed";
export type BlinkFocusMode = "start_day" | "end_day" | "outside_transition";

export interface BlinkFocusEffect {
  mode: BlinkFocusMode;
  reducedMotion: "fade" | "full";
}

export function resolveBlinkFocusEffect(reason: BlinkEntryReason, reducedMotion = false): BlinkFocusEffect | null {
  if (reason === "stored_profile_refresh") return null;

  return {
    mode: getBlinkFocusMode(reason),
    reducedMotion: reducedMotion ? "fade" : "full",
  };
}

function getBlinkFocusMode(reason: Exclude<BlinkEntryReason, "stored_profile_refresh">): BlinkFocusMode {
  if (reason === "service_exit") return "end_day";
  if (reason === "journal_opened" || reason === "journal_closed") return "outside_transition";
  return "start_day";
}
