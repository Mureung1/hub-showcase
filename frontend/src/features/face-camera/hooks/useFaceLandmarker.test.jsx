import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useFaceLandmarker from "./useFaceLandmarker";

const mediaPipeMocks = vi.hoisted(() => ({
  close: vi.fn(),
  createFromOptions: vi.fn(),
  forVisionTasks: vi.fn()
}));

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: {
    forVisionTasks: mediaPipeMocks.forVisionTasks
  },
  FaceLandmarker: {
    createFromOptions: mediaPipeMocks.createFromOptions
  }
}));

describe("useFaceLandmarker", () => {
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    mediaPipeMocks.close.mockReset();
    mediaPipeMocks.forVisionTasks.mockReset().mockResolvedValue({});
    mediaPipeMocks.createFromOptions.mockReset().mockResolvedValue({
      close: mediaPipeMocks.close,
      detectForVideo: vi.fn()
    });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: originalMediaDevices
    });
    vi.restoreAllMocks();
  });

  it("reports permission denial without throwing", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(
          Object.assign(new Error("denied"), { name: "NotAllowedError" })
        )
      }
    });
    const { result } = renderHook(() => useFaceLandmarker());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.cameraStatus).toBe("permission-denied");
    expect(result.current.errorMessage).toContain("수동 선택");
  });

  it("stops media tracks and closes MediaPipe on unmount", async () => {
    const stop = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop }]
        })
      }
    });
    const { result, unmount } = renderHook(() => useFaceLandmarker());

    await act(async () => {
      await result.current.startCamera();
    });
    await waitFor(() => expect(result.current.cameraStatus).toBe("running"));

    unmount();

    expect(stop).toHaveBeenCalledTimes(1);
    expect(mediaPipeMocks.close).toHaveBeenCalledTimes(1);
  });
});
