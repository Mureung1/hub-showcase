const ONBOARDING_COMPLETE_KEY = "alrijang:onboardingComplete";

export function isOnboardingComplete() {
  return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true";
}

export function markOnboardingComplete() {
  localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
}
