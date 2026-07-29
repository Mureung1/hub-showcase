import React from "react";
import ProgressBar from "../../../shared/components/ProgressBar";
import useFaceLandmarker from "../hooks/useFaceLandmarker";

const cameraStatusMessages = {
  idle: "카메라를 시작하면 얼굴 표정 신호를 확인합니다.",
  loading: "얼굴 표정 감지 모델을 불러오고 있습니다.",
  "requesting-permission": "카메라 사용 권한을 요청하고 있습니다.",
  running: "카메라가 실행 중입니다.",
  stopped: "카메라가 종료되었습니다.",
  unsupported: "이 브라우저에서는 카메라 기능을 지원하지 않습니다.",
  "permission-denied": "카메라 권한이 거부되었습니다.",
  "no-device": "사용할 수 있는 카메라를 찾지 못했습니다.",
  error: "카메라 실행 중 문제가 발생했습니다."
};

const detectionStatusMessages = {
  waiting: "",
  "loading-model": "영상이 연결되었습니다. 분석 모델을 준비하고 있습니다.",
  "no-face": "카메라에서 얼굴을 찾고 있습니다.",
  stabilizing: "얼굴 표정 신호를 안정화하고 있습니다.",
  detected: "안정된 얼굴 표정 신호를 감지했습니다.",
  "multiple-faces": "한 명의 얼굴만 카메라에 보이도록 해주세요.",
  error: "얼굴 표정 신호를 처리하지 못했습니다."
};

const featureLabels = {
  browDownLeft: "왼쪽 눈썹 내림",
  browDownRight: "오른쪽 눈썹 내림",
  browInnerUp: "안쪽 눈썹 올림",
  eyeSquintLeft: "왼쪽 눈 가늘게 뜸",
  eyeSquintRight: "오른쪽 눈 가늘게 뜸",
  mouthFrownLeft: "왼쪽 입꼬리 내림",
  mouthFrownRight: "오른쪽 입꼬리 내림",
  mouthPressLeft: "왼쪽 입술 압박",
  mouthPressRight: "오른쪽 입술 압박",
  mouthSmileLeft: "왼쪽 입꼬리 올림",
  mouthSmileRight: "오른쪽 입꼬리 올림"
};

export default function FaceCamera({
  onSignalChange,
  disabled = false,
  initialResult = null
}) {
  const {
    videoRef,
    cameraStatus,
    detectionStatus,
    detectedResult,
    errorMessage,
    startCamera,
    stopCamera
  } = useFaceLandmarker({ onStableResult: onSignalChange });
  const displayedResult = detectedResult || initialResult;
  const isStarting =
    cameraStatus === "loading" || cameraStatus === "requesting-permission";
  const isRunning = cameraStatus === "running";

  return (
    <section className="face-camera" aria-labelledby="face-camera-title">
      <div className="face-camera-heading">
        <h4 id="face-camera-title">카메라 얼굴 표정 신호</h4>
        <div className="face-camera-actions">
          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={disabled || isStarting || isRunning}
          >
            카메라 시작
          </button>
          <button
            type="button"
            onClick={stopCamera}
            disabled={disabled || !isRunning}
          >
            카메라 종료
          </button>
        </div>
      </div>

      <p className="camera-privacy">
        카메라 영상은 브라우저 안에서만 분석되며 서버나 데이터베이스에 저장되지
        않습니다.
      </p>

      <video
        ref={videoRef}
        className={`camera-preview ${isRunning ? "" : "camera-preview-hidden"}`}
        muted
        playsInline
        aria-label="카메라 미리보기"
      />

      <div className="camera-status" role="status" aria-live="polite">
        <p>{cameraStatusMessages[cameraStatus] || cameraStatus}</p>
        {detectionStatusMessages[detectionStatus] && (
          <p>{detectionStatusMessages[detectionStatus]}</p>
        )}
        {errorMessage && <p className="camera-error">{errorMessage}</p>}
      </div>

      {displayedResult && (
        <div className="detected-face-signal">
          <strong>감지된 얼굴 움직임 신호</strong>
          {displayedResult.features?.length > 0 ? (
            <ul className="face-feature-list">
              {displayedResult.features.map((feature) => (
                <li key={feature.name}>
                  <ProgressBar
                    label={featureLabels[feature.name] || feature.name}
                    value={Math.round(feature.score * 100)}
                    role="meter"
                    tone="signal"
                    size="compact"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <span>뚜렷하게 활성화된 얼굴 움직임 신호가 없습니다.</span>
          )}
          <small>
            이 값은 얼굴 근육 움직임의 상대 강도이며 감정 판정 결과가 아닙니다.
          </small>
        </div>
      )}
    </section>
  );
}
