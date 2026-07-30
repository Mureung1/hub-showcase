export function toPatientStatusUrl(openPath: string, patientWebUrl: string): string {
  try {
    const url = new URL(openPath, patientWebUrl);
    if (url.pathname.startsWith("/onsite-status/")) {
      return new URL(`${url.pathname}${url.search}${url.hash}`, patientWebUrl).toString();
    }
    return url.toString();
  } catch {
    return openPath;
  }
}
