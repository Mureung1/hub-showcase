import { useCallback, useEffect, useRef, useState } from "react";
import {
  attachCameraStream,
  requestUserCamera,
  stopCameraStream
} from "../runtime/cameraStream";
import {
  createFaceLandmarkerRuntime
} from "../runtime/faceLandmarkerRuntime";
import { processFaceResult } from "../runtime/processFaceResult";

const DETECTION_INTERVAL_MS = 125;

function getCameraError(error) {
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      status: "unsupported",
      message: "이 브라우저에서는 카메라 기능을 지원하지 않습니다."
    };
  }

  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return {
      status: "permission-denied",
      message: "카메라 권한이 거부되었습니다. 수동 선택으로 계속 진행할 수 있습니다."
    };
  }

  if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") {
    return {
      status: "no-device",
      message: "사용할 수 있는 카메라를 찾지 못했습니다."
    };
  }

  return {
    status: "error",
    message: "카메라 실행 중 문제가 발생했습니다. 수동 선택으로 계속 진행해 주세요."
  };
}

export default function useFaceLandmarker({ onStableResult } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastDetectionAtRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const samplesRef = useRef([]);
  const lastStableKeyRef = useRef("");
  const operationIdRef = useRef(0);
  const mountedRef = useRef(true);
  const onStableResultRef = useRef(onStableResult);
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [detectionStatus, setDetectionStatus] = useState("waiting");
  const [detectedResult, setDetectedResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    onStableResultRef.current = onStableResult;
  }, [onStableResult]);

  const clearDetectedResult = useCallback((notifyParent = false) => {
    const hadStableResult = Boolean(lastStableKeyRef.current);
    lastStableKeyRef.current = "";
    setDetectedResult(null);

    if (notifyParent && hadStableResult) {
      onStableResultRef.current?.(null);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    stopCameraStream(streamRef.current, videoRef.current);
    streamRef.current = null;

    samplesRef.current = [];
    lastDetectionAtRef.current = 0;
    lastVideoTimeRef.current = -1;
  }, []);

  const stopCamera = useCallback(() => {
    operationIdRef.current += 1;
    stopStream();
    clearDetectedResult(true);
    setCameraStatus("stopped");
    setDetectionStatus("waiting");
    setErrorMessage("");
  }, [clearDetectedResult, stopStream]);

  const runDetection = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker || !streamRef.current || video.readyState < 2) {
      animationFrameRef.current = window.requestAnimationFrame(runDetection);
      return;
    }

    const now = performance.now();
    if (
      now - lastDetectionAtRef.current < DETECTION_INTERVAL_MS ||
      video.currentTime === lastVideoTimeRef.current
    ) {
      animationFrameRef.current = window.requestAnimationFrame(runDetection);
      return;
    }

    lastDetectionAtRef.current = now;
    lastVideoTimeRef.current = video.currentTime;

    try {
      const result = landmarker.detectForVideo(video, now);
      const processed = processFaceResult(result, samplesRef.current);
      samplesRef.current = processed.samples;
      setDetectionStatus(processed.status);

      if (
        processed.status === "no-face" ||
        processed.status === "multiple-faces"
      ) {
        clearDetectedResult(true);
      } else if (processed.stableResult) {
        const stableKey = JSON.stringify(processed.stableResult);

        if (stableKey !== lastStableKeyRef.current) {
          lastStableKeyRef.current = stableKey;
          setDetectedResult(processed.stableResult);
          onStableResultRef.current?.(processed.stableResult);
        }
      }
    } catch {
      clearDetectedResult(true);
      setDetectionStatus("error");
      setErrorMessage("얼굴 표현 신호를 처리하지 못했습니다. 수동 선택을 사용할 수 있습니다.");
    }

    animationFrameRef.current = window.requestAnimationFrame(runDetection);
  }, [clearDetectedResult]);

  const startCamera = useCallback(async () => {
    const operationId = operationIdRef.current + 1;
    operationIdRef.current = operationId;
    stopStream();
    clearDetectedResult(true);
    setDetectionStatus("waiting");
    setErrorMessage("");

    if (!navigator.mediaDevices?.getUserMedia) {
      const cameraError = getCameraError();
      setCameraStatus(cameraError.status);
      setErrorMessage(cameraError.message);
      return;
    }

    try {
      setCameraStatus("requesting-permission");
      const stream = await requestUserCamera();

      if (!mountedRef.current || operationId !== operationIdRef.current) {
        stopCameraStream(stream);
        return;
      }

      streamRef.current = stream;
      await attachCameraStream(videoRef.current, stream);

      if (!mountedRef.current || operationId !== operationIdRef.current) {
        stopStream();
        return;
      }

      setCameraStatus("running");
      setDetectionStatus("loading-model");

      if (!landmarkerRef.current) {
        const createdLandmarker = await createFaceLandmarkerRuntime();

        if (!mountedRef.current || operationId !== operationIdRef.current) {
          createdLandmarker.close();
          return;
        }

        landmarkerRef.current = createdLandmarker;
      }

      if (!mountedRef.current || operationId !== operationIdRef.current) return;

      setDetectionStatus("no-face");
      animationFrameRef.current = window.requestAnimationFrame(runDetection);
    } catch (error) {
      stopStream();
      if (!mountedRef.current) return;
      const cameraError = getCameraError(error);
      setCameraStatus(cameraError.status);
      setDetectionStatus("error");
      setErrorMessage(cameraError.message);
    }
  }, [clearDetectedResult, runDetection, stopStream]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      operationIdRef.current += 1;
      stopStream();
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [stopStream]);

  return {
    videoRef,
    cameraStatus,
    detectionStatus,
    detectedResult,
    errorMessage,
    startCamera,
    stopCamera
  };
}
