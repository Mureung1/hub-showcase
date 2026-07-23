export type BlinkEntryReason = "onboarding_completed" | "stored_profile_refresh" | "service_exit";
export type BlinkFocusMode = "start_day" | "end_day";

export interface BlinkFocusEffect {
  mode: BlinkFocusMode;
  reducedMotion: "fade" | "full";
}

export function resolveBlinkFocusEffect(reason: BlinkEntryReason, reducedMotion = false): BlinkFocusEffect | null {
  if (reason === "stored_profile_refresh") return null;

  return {
    mode: reason === "service_exit" ? "end_day" : "start_day",
    reducedMotion: reducedMotion ? "fade" : "full",
  };
}
