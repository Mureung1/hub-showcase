import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSceneJob } from "./useSceneJob";

const queuedJob = {
  id: "scene-1",
  scene_name: "Test scene",
  capture_type: "images",
  status: "queued",
  blocked_reason: null,
  next_action: null,
  asset_url: null,
  camera_pose: null,
  files: [],
  stages: [],
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useSceneJob", () => {
  it("cleans up polling when the workspace closes", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(queuedJob), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result, unmount } = renderHook(() => useSceneJob());

    await act(async () => result.current.submit(new FormData()));
    unmount();
    await act(async () => vi.advanceTimersByTimeAsync(2_000));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
