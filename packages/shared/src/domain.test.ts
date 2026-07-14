import { describe, expect, it } from "vitest";
import { calculatePatientCount, patientCountsSchema } from "./domain.js";

describe("patientCountsSchema", () => {
  it("가족의 실제 환자 수를 계산한다", () => {
    const counts = patientCountsSchema.parse({ child: 2, adult: 1, senior: 0 });

    expect(calculatePatientCount(counts)).toBe(3);
  });

  it("환자가 없는 접수를 거절한다", () => {
    const result = patientCountsSchema.safeParse({ child: 0, adult: 0, senior: 0 });

    expect(result.success).toBe(false);
  });
});
