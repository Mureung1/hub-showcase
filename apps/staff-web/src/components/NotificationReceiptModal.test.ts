import { describe, expect, it } from "vitest";
import { toPatientStatusUrl } from "../utils/patientStatusUrl";

describe("toPatientStatusUrl", () => {
  it("현장 상태 상대 경로는 환자 웹 주소로 바꾼다", () => {
    expect(toPatientStatusUrl("/onsite-status/mock-token", "http://127.0.0.1:5173")).toBe(
      "http://127.0.0.1:5173/onsite-status/mock-token",
    );
  });

  it("현장 상태 전체 URL의 도메인이 잘못되어도 환자 웹 주소로 바꾼다", () => {
    expect(
      toPatientStatusUrl(
        "https://baro-jinryo-staff.vercel.app/onsite-status/mock-token",
        "http://127.0.0.1:5173",
      ),
    ).toBe("http://127.0.0.1:5173/onsite-status/mock-token");
  });

  it("현장 상태가 아닌 전체 URL은 그대로 둔다", () => {
    expect(toPatientStatusUrl("https://example.com/help", "http://127.0.0.1:5173")).toBe(
      "https://example.com/help",
    );
  });
});
