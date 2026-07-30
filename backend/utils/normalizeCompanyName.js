export function normalizeCompanyName(companyName) {
  if (!companyName) {
    return "";
  }

  return String(companyName)
    .trim()
    .replace(/\s+/g, "")
    .replace(/\(주\)/g, "")
    .replace(/㈜/g, "")
    .replace(/주식회사/g, "")
    .replace(/유한회사/g, "")
    .replace(/코퍼레이션/gi, "")
    .toUpperCase();
}