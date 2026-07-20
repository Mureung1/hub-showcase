import { describe, it, expect } from "vitest";
import { pickCheckpointLevel } from "./reasonCheckpoint.js";

describe("pickCheckpointLevel", () => {
  it("레벨 1로 처음 오르고 아직 체크 안 했으면 1을 반환한다 (happy path)", () => {
    expect(pickCheckpointLevel(new Set(), true, 1)).toBe(1);
  });

  it("레벨 3으로 처음 오르고 아직 체크 안 했으면 3을 반환한다 (happy path)", () => {
    expect(pickCheckpointLevel(new Set(), true, 3)).toBe(3);
  });

  it("leveledUp이 false면 레벨과 무관하게 null (분기 1)", () => {
    expect(pickCheckpointLevel(new Set(), false, 1)).toBeNull();
    expect(pickCheckpointLevel(new Set(), false, 3)).toBeNull();
  });

  it("레벨이 1/3이 아니면 leveledUp이어도 null (분기 2)", () => {
    expect(pickCheckpointLevel(new Set(), true, 0)).toBeNull();
    expect(pickCheckpointLevel(new Set(), true, 2)).toBeNull();
    expect(pickCheckpointLevel(new Set(), true, 4)).toBeNull();
  });

  it("이미 체크한 레벨이면 다시 오르는 순간이어도 null (분기 3)", () => {
    expect(pickCheckpointLevel(new Set([1]), true, 1)).toBeNull();
    expect(pickCheckpointLevel(new Set([3]), true, 3)).toBeNull();
  });

  it("레벨 1을 체크했어도 레벨 3은 독립적으로 노출된다 (1↔3 재진입, 경계)", () => {
    const checked = new Set([1]);
    expect(pickCheckpointLevel(checked, true, 3)).toBe(3);
  });

  it("레벨 3을 체크했어도 레벨 1은 독립적으로 노출된다 (1↔3 재진입, 경계)", () => {
    const checked = new Set([3]);
    expect(pickCheckpointLevel(checked, true, 1)).toBe(1);
  });

  it("멈추기로 레벨이 내려갔다가 같은 레벨(1)로 재진입하면 다시 뜨지 않는다 (회귀)", () => {
    const checked = new Set<number>();
    const first = pickCheckpointLevel(checked, true, 1);
    expect(first).toBe(1);
    checked.add(1);

    // 멈추기로 레벨이 0으로 내려갔다가(체크포인트 미노출) 다시 1로 올라온 상황을 재현
    expect(pickCheckpointLevel(checked, false, 0)).toBeNull();
    expect(pickCheckpointLevel(checked, true, 1)).toBeNull();
  });
});
