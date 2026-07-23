export type PersonalDataKind = "email" | "phone" | "residentId" | "accountNumber";

export type PersonalDataFinding = {
  kind: PersonalDataKind;
  start: number;
  end: number;
  preview: string;
};

const patterns: Array<{ kind: PersonalDataKind; expression: RegExp }> = [
  { kind: "residentId", expression: /\b\d{6}[ -]?[1-4]\d{6}\b/g },
  { kind: "email", expression: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { kind: "phone", expression: /(?<!\d)01[016789][ -]?\d{3,4}[ -]?\d{4}(?!\d)/g },
  {
    kind: "accountNumber",
    expression: /(?<!\d)\d{2,6}[ -]\d{2,6}[ -]\d{2,6}(?:[ -]\d{1,6})?(?!\d)/g,
  },
];

export function findPersonalData(text: string): PersonalDataFinding[] {
  const findings: PersonalDataFinding[] = [];
  const occupied: Array<{ start: number; end: number }> = [];

  for (const { kind, expression } of patterns) {
    expression.lastIndex = 0;
    for (const match of text.matchAll(expression)) {
      const start = match.index;
      const value = match[0];
      if (start === undefined || !value) continue;
      if (kind === "accountNumber") {
        const digits = value.replace(/\D/g, "");
        if (digits.length < 10 || digits.length > 16) continue;
      }
      const end = start + value.length;
      if (occupied.some((span) => start < span.end && end > span.start)) continue;
      occupied.push({ start, end });
      findings.push({ kind, start, end, preview: maskValue(value) });
    }
  }

  return findings.sort((left, right) => left.start - right.start);
}

export function maskPersonalData(text: string, findings = findPersonalData(text)) {
  let output = text;
  for (const finding of [...findings].sort((left, right) => right.start - left.start)) {
    output = `${output.slice(0, finding.start)}${maskValue(output.slice(finding.start, finding.end))}${output.slice(finding.end)}`;
  }
  return output;
}

export function summarizePersonalData(findings: PersonalDataFinding[]) {
  return findings.reduce<Record<PersonalDataKind, number>>(
    (summary, finding) => ({ ...summary, [finding.kind]: summary[finding.kind] + 1 }),
    { email: 0, phone: 0, residentId: 0, accountNumber: 0 },
  );
}

function maskValue(value: string) {
  return [...value].map((character) => /[\p{L}\p{N}]/u.test(character) ? "•" : character).join("");
}
