import { describe, it, expect, afterEach } from "vitest";
import { createProfile, getProfile, updateProfile } from "./brandProfileRepo.js";
import { supabase } from "../db/index.js";

// 실제 Supabase 프로젝트에 그대로 연결해서 검증한다(mock 없음). 각 테스트가
// 만든 행은 afterEach에서 직접 지워서 테스트 간 독립성을 지킨다.
const createdIds = [];

afterEach(async () => {
  while (createdIds.length > 0) {
    const id = createdIds.pop();
    await supabase.from("brand_profiles").delete().eq("id", id);
  }
});

function sampleFields(overrides = {}) {
  return {
    businessType: "디저트 카페",
    storeName: "OO카페",
    mainProduct: "티라미수, 아인슈페너",
    targetCustomer: "동네 주민",
    brandMood: "아늑하고 친근한",
    strength: "가성비 좋은 디저트",
    tone: "친근하고 다정한 말투",
    goal: "신규 고객 유입",
    summary: "동네 주민이 자주 찾는 가성비 좋은 디저트 디저트 카페",
    keywords: ["아늑하고 친근한", "가성비 좋은 디저트", "디저트 카페"],
    ...overrides,
  };
}

describe("createProfile", () => {
  it("정상 입력을 주면 id/createdAt/updatedAt이 채워진 프로필을 생성한다", async () => {
    // Arrange
    const fields = sampleFields();

    // Act
    const profile = await createProfile(fields);
    createdIds.push(profile.id);

    // Assert
    expect(profile.id).toBeTypeOf("string");
    expect(profile.createdAt).toBeTypeOf("string");
    expect(profile.updatedAt).toBeTypeOf("string");
    expect(profile.storeName).toBe("OO카페");
  });
});

describe("getProfile", () => {
  it("프로필이 하나도 없으면 null을 반환한다", async () => {
    // Arrange & Act
    const profile = await getProfile();

    // Assert
    expect(profile).toBeNull();
  });

  it("여러 프로필이 있으면 가장 최근에 생성된 1건만 반환한다", async () => {
    // Arrange
    const older = await createProfile(sampleFields({ storeName: "이전카페" }));
    createdIds.push(older.id);
    const newer = await createProfile(sampleFields({ storeName: "최신카페" }));
    createdIds.push(newer.id);

    // Act
    const profile = await getProfile();

    // Assert
    expect(profile.id).toBe(newer.id);
    expect(profile.storeName).toBe("최신카페");
  });
});

describe("updateProfile", () => {
  it("기존 프로필이 없으면 null을 반환한다", async () => {
    // Arrange
    const patch = { storeName: "새이름카페" };

    // Act
    const updated = await updateProfile(patch);

    // Assert
    expect(updated).toBeNull();
  });

  it("기존 프로필이 있으면 patch를 반영하고 id는 유지, updatedAt은 갱신한다", async () => {
    // Arrange
    const created = await createProfile(sampleFields());
    createdIds.push(created.id);

    // Act
    const updated = await updateProfile({ storeName: "새이름카페" });

    // Assert
    expect(updated.id).toBe(created.id);
    expect(updated.storeName).toBe("새이름카페");
    expect(updated.updatedAt).not.toBe(created.updatedAt);
  });
});
