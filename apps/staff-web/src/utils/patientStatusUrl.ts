export function toPatientStatusUrl(openPath: string, patientWebUrl: string): string {
  try {
    const url = new URL(openPath, patientWebUrl);
    if (url.pathname.startsWith("/onsite-status/")) {
      const lookupToken = url.pathname.split("/").filter(Boolean).at(-1);
      const statusUrl = new URL("/", patientWebUrl);
      if (lookupToken) statusUrl.searchParams.set("onsiteStatus", lookupToken);
      return statusUrl.toString();
    }
    return url.toString();
  } catch {
    return openPath;
  }
}
