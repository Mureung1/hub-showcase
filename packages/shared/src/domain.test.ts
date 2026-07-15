import { describe, expect, it } from "vitest";
import {
  accountStatusSchema,
  calculatePatientCount,
  calculateRegistrationPatientCount,
  e164PhoneNumberSchema,
  hospitalApprovalStatusSchema,
  notificationDeliveryStatusSchema,
  notificationTypeSchema,
  patientCountsSchema,
  patientInputConfigurationSchema,
  patientRegistrationInputSchema,
} from "./domain.js";

describe("공통 상태 스키마", () => {
  it("DB 제약조건과 같은 계정·병원 상태를 허용한다", () => {
    expect(accountStatusSchema.parse("suspended")).toBe("suspended");
    expect(hospitalApprovalStatusSchema.parse("approved")).toBe("approved");
  });

  it("알림 종류와 mock 발송 상태를 검증한다", () => {
    expect(notificationTypeSchema.parse("entry_requested")).toBe("entry_requested");
    expect(notificationDeliveryStatusSchema.parse("sent")).toBe("sent");
    expect(notificationDeliveryStatusSchema.safeParse("delivered").success).toBe(false);
  });
});

describe("e164PhoneNumberSchema", () => {
  it("정규화된 한국 휴대전화 번호를 허용한다", () => {
    expect(e164PhoneNumberSchema.parse("+821012345678")).toBe("+821012345678");
  });

  it("국내 표시 형식을 DB 저장값으로 허용하지 않는다", () => {
    expect(e164PhoneNumberSchema.safeParse("010-1234-5678").success).toBe(false);
  });
});

describe("patientCountsSchema", () => {
  it("가족의 실제 환자 수를 계산한다", () => {
    const counts = patientCountsSchema.parse({ child: 2, youth: 1, adult: 0 });

    expect(calculatePatientCount(counts)).toBe(3);
  });

  it("환자가 없는 접수를 거절한다", () => {
    const result = patientCountsSchema.safeParse({ child: 0, youth: 0, adult: 0 });

    expect(result.success).toBe(false);
  });

  it("분류 종류와 관계없이 총 9명을 초과하면 거절한다", () => {
    const result = patientCountsSchema.safeParse({ infant: 4, youth: 3, adult: 3 });

    expect(result.success).toBe(false);
  });
});

describe("patient input configuration", () => {
  it("분류형은 분류가 1개 이상이어야 한다", () => {
    const result = patientInputConfigurationSchema.safeParse({
      inputMode: "categorized",
      categories: [],
    });

    expect(result.success).toBe(false);
  });

  it("총인원형은 분류를 저장하지 않는다", () => {
    const result = patientInputConfigurationSchema.safeParse({
      inputMode: "total_only",
      categories: [],
    });

    expect(result.success).toBe(true);
  });
});

describe("patient registration input", () => {
  it("분류형 요청의 실제 환자 수를 서버에서 합산한다", () => {
    const input = patientRegistrationInputSchema.parse({
      inputMode: "categorized",
      patientCounts: { child: 1, youth: 0, adult: 2 },
    });

    expect(calculateRegistrationPatientCount(input)).toBe(3);
  });

  it("총인원형 요청의 입력값을 검증해 실제 환자 수로 사용한다", () => {
    const input = patientRegistrationInputSchema.parse({
      inputMode: "total_only",
      totalCount: 3,
    });

    expect(calculateRegistrationPatientCount(input)).toBe(3);
  });

  it("클라이언트가 patientCount만 직접 전달할 수 없다", () => {
    const result = patientRegistrationInputSchema.safeParse({
      inputMode: "total_only",
      patientCount: 3,
    });

    expect(result.success).toBe(false);
  });
});
