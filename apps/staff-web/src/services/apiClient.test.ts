import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, getStaffQueue, isApiClientErrorCode } from "./apiClient";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("staff api client", () => {
  it("병원 소속이 없는 오류의 코드와 메시지를 보존한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "HOSPITAL_ACCESS_DENIED",
              message: "승인된 병원 소속을 확인할 수 없습니다.",
            },
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    const request = getStaffQueue();

    await expect(request).rejects.toMatchObject({
      status: 403,
      code: "HOSPITAL_ACCESS_DENIED",
      message: "승인된 병원 소속을 확인할 수 없습니다.",
    });
    await request.catch((error: unknown) => {
      expect(error).toBeInstanceOf(ApiClientError);
      expect(isApiClientErrorCode(error, "HOSPITAL_ACCESS_DENIED")).toBe(true);
    });
  });
});
