export function isValidBirthYear(birthYear: number): boolean {
  if (!Number.isInteger(birthYear)) return false;
  const currentYear = new Date().getFullYear();
  return birthYear >= 1900 && birthYear <= currentYear;
}
