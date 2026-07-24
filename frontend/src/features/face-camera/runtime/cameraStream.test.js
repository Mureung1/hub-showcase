import { describe, expect, it, vi } from "vitest";
import {
  attachCameraStream,
  requestUserCamera,
  stopCameraStream
} from "./cameraStream";

describe("cameraStream", () => {
  it("requests user-facing video without audio", async () => {
    const stream = { getTracks: vi.fn() };
    const mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(stream)
    };

    await expect(requestUserCamera(mediaDevices)).resolves.toBe(stream);
    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: "user" },
      audio: false
    });
  });

  it("attaches, plays, stops, and detaches a stream", async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] };
    const video = { srcObject: null, play: vi.fn().mockResolvedValue() };

    await attachCameraStream(video, stream);
    expect(video.srcObject).toBe(stream);
    expect(video.play).toHaveBeenCalledOnce();

    stopCameraStream(stream, video);
    expect(stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
  });
});
