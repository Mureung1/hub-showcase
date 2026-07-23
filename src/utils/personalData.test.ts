import { describe, expect, it } from "vitest";
import { findPersonalData, maskPersonalData, summarizePersonalData } from "./personalData";

describe("personal data review", () => {
  it("detects supported Korean contact and identifier formats without returning raw values", () => {
    const text = "문의 test.user@example.com, 010-1234-5678, 주민번호 990101-1234567, 계좌 123-456-789012";
    const findings = findPersonalData(text);

    expect(findings.map((finding) => finding.kind)).toEqual([
      "email",
      "phone",
      "residentId",
      "accountNumber",
    ]);
    expect(JSON.stringify(findings)).not.toContain("test.user@example.com");
    expect(summarizePersonalData(findings)).toEqual({
      email: 1,
      phone: 1,
      residentId: 1,
      accountNumber: 1,
    });
  });

  it("masks detected values while preserving punctuation and surrounding context", () => {
    const text = "담당자: student@example.com / 010 9876 5432";
    const masked = maskPersonalData(text);

    expect(masked).toContain("담당자:");
    expect(masked).toContain("@");
    expect(masked).not.toContain("student");
    expect(masked).not.toContain("9876");
    expect(masked).toHaveLength(text.length);
  });

  it("does not double-count a resident id as a generic account number", () => {
    const findings = findPersonalData("식별값 990101-1234567만 확인");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe("residentId");
  });

  it("does not treat ordinary ISO-style meeting dates as bank accounts", () => {
    expect(findPersonalData("회의일은 2026-07-13이며 다음 회의는 2026-07-20이다.")).toEqual([]);
  });
});
