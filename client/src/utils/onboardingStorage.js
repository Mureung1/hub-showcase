import { completeMyOnboarding } from "../api/mentees";

const storageKeyPrefix = "mentoring.onboarding";

function buildKey(tourId, userId) {
  return `${storageKeyPrefix}.${tourId}.${userId}`;
}

function hasSeenTourLocally(tourId, userId) {
  if (!tourId || !userId) return true;

  try {
    return window.localStorage.getItem(buildKey(tourId, userId)) === "1";
  } catch {
    return true;
  }
}

function markTourSeenLocally(tourId, userId) {
  if (!tourId || !userId) return;

  try {
    window.localStorage.setItem(buildKey(tourId, userId), "1");
  } catch {
    // localStorage를 사용할 수 없는 환경(프라이빗 모드 등)에서는 조용히 무시한다.
  }
}

// 서버 값(serverCompletedAt, currentUser의 *OnboardedAt 필드)이 있으면 그것을
// 우선 신뢰하고, 없으면(과거 계정이거나 아직 서버 응답을 못 받은 경우) localStorage로 폴백한다.
export function hasSeenTour(tourId, userId, serverCompletedAt) {
  if (serverCompletedAt) return true;

  return hasSeenTourLocally(tourId, userId);
}

// 다른 브라우저/기기에서도 재노출되지 않도록 서버에도 완료 처리를 시도하고,
// 네트워크 상태와 무관하게 항상 localStorage에도 즉시 기록해 둔다(서버 요청 실패 시 폴백).
export async function markTourSeen(tourId, userId, serverTourKey) {
  markTourSeenLocally(tourId, userId);

  if (!serverTourKey) return;

  try {
    await completeMyOnboarding(serverTourKey);
  } catch {
    // 서버 저장에 실패해도 이번 브라우저에서는 localStorage 폴백으로 재노출을 막는다.
  }
}
