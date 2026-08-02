export const patientWebUrl =
  import.meta.env.VITE_PATIENT_WEB_URL ?? inferPatientWebUrl();

export const staffWebUrl =
  import.meta.env.VITE_STAFF_WEB_URL ?? "http://127.0.0.1:5174";

function inferPatientWebUrl(): string {
  if (typeof window === "undefined") return "http://127.0.0.1:5173";

  const origin = window.location.origin;
  if (origin.includes("baro-jinryo-staff")) {
    return origin.replace("baro-jinryo-staff", "baro-jinryo-patient");
  }

  return "http://127.0.0.1:5173";
}
