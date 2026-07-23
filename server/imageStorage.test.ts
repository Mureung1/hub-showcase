import { describe, expect, it } from "vitest";
import { getStoragePathFromPublicUrl } from "./imageStorage";

describe("getStoragePathFromPublicUrl", () => {
  it("public Storage URL에서 삭제할 경로를 추출한다", () => {
    expect(
      getStoragePathFromPublicUrl(
        "https://project.supabase.co/storage/v1/object/public/later-images/folder/photo.jpg",
        "later-images"
      )
    ).toBe("folder/photo.jpg");
  });

  it("다른 버킷 또는 잘못된 URL은 무시한다", () => {
    expect(
      getStoragePathFromPublicUrl(
        "https://project.supabase.co/storage/v1/object/public/other/photo.jpg",
        "later-images"
      )
    ).toBeNull();
    expect(getStoragePathFromPublicUrl("not-a-url", "later-images")).toBeNull();
  });
});
