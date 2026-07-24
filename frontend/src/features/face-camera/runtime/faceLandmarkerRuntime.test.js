import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFaceLandmarkerRuntime } from "./faceLandmarkerRuntime";

const mocks = vi.hoisted(() => ({
  forVisionTasks: vi.fn(),
  createFromOptions: vi.fn()
}));

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: mocks.forVisionTasks },
  FaceLandmarker: { createFromOptions: mocks.createFromOptions }
}));

describe("createFaceLandmarkerRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.forVisionTasks.mockResolvedValue({ wasm: true });
  });

  it("creates the video landmarker with blendshape output and GPU first", async () => {
    const landmarker = { close: vi.fn() };
    mocks.createFromOptions.mockResolvedValue(landmarker);

    await expect(createFaceLandmarkerRuntime()).resolves.toBe(landmarker);
    expect(mocks.createFromOptions).toHaveBeenCalledWith(
      { wasm: true },
      expect.objectContaining({
        runningMode: "VIDEO",
        numFaces: 2,
        outputFaceBlendshapes: true,
        baseOptions: expect.objectContaining({ delegate: "GPU" })
      })
    );
  });

  it("retries without GPU when GPU initialization fails", async () => {
    const landmarker = { close: vi.fn() };
    mocks.createFromOptions
      .mockRejectedValueOnce(new Error("GPU unavailable"))
      .mockResolvedValueOnce(landmarker);

    await expect(createFaceLandmarkerRuntime()).resolves.toBe(landmarker);
    expect(mocks.createFromOptions).toHaveBeenCalledTimes(2);
    expect(mocks.createFromOptions.mock.calls[1][1].baseOptions).not.toHaveProperty(
      "delegate"
    );
  });
});
