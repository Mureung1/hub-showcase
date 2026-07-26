import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  getImageValidationError,
  isSupportedImageType,
} from "./image";

describe("image validation", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("%s 형식을 허용한다", (type) => {
    expect(isSupportedImageType(type)).toBe(true);
    expect(getImageValidationError({ type, size: MAX_IMAGE_BYTES })).toBeNull();
  });

  it("지원하지 않는 형식에 사용자 오류 메시지를 반환한다", () => {
    expect(getImageValidationError({ type: "image/gif", size: 100 })).toContain(
      "JPEG, PNG, WebP"
    );
  });

  it("5MB 초과 파일에 사용자 오류 메시지를 반환한다", () => {
    expect(
      getImageValidationError({
        type: "image/jpeg",
        size: MAX_IMAGE_BYTES + 1,
      })
    ).toContain("최대 5MB");
  });
});
