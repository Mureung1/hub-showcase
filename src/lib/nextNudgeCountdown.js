// Task 카드의 "다음 알림까지" 카운트다운 표시 순수 함수. 실제 남은 시간(ms)만
// 입력받아 문구를 만든다 — 타이머 자체(setInterval 등)는 컴포넌트가 관리한다.

// 5초 이하로 남으면 초 단위 숫자보다 "곧" 쪽이 덜 조급하게 느껴져 이 표현을 쓴다.
const SOON_THRESHOLD_SECONDS = 5;
// 59초까지는 초 단위, 60초(1분)부터는 mm:ss로 전환한다.
const SECONDS_DISPLAY_MAX = 59;

export function formatNextNudgeCountdown(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  if (totalSeconds <= SOON_THRESHOLD_SECONDS) {
    return "곧 다시 알려드릴게요";
  }
  if (totalSeconds <= SECONDS_DISPLAY_MAX) {
    return `다음 알림까지 ${totalSeconds}초`;
  }

  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `다음 알림까지 ${mm}:${ss}`;
}
