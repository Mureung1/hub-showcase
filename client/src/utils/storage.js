const CURRENT_MEMBER_KEY = 'teamplan_currentMemberId';
const NOTIFIED_KEY_PREFIX = 'teamplan_notified_';

// 일부 브라우저는 file:// 페이지에서 localStorage 접근을 막고 예외를 던지기도 해서,
// 그런 경우에도 나머지 화면 동작은 계속되도록 localStorage만 따로 감싼다.
export function safeGetStoredMemberId() {
  try {
    return Number(localStorage.getItem(CURRENT_MEMBER_KEY));
  } catch (e) {
    return NaN;
  }
}

export function safeSetStoredMemberId(id) {
  try {
    localStorage.setItem(CURRENT_MEMBER_KEY, String(id));
  } catch (e) {
    // 저장 실패해도 화면 동작에는 지장 없음 (새로고침 유지만 안 될 뿐)
  }
}

export function wasNotifiedToday(taskId, today) {
  try {
    return localStorage.getItem(NOTIFIED_KEY_PREFIX + taskId) === today;
  } catch (e) {
    return false;
  }
}

export function markNotifiedToday(taskId, today) {
  try {
    localStorage.setItem(NOTIFIED_KEY_PREFIX + taskId, today);
  } catch (e) {
    // 저장 실패해도 알림 자체는 이미 떴으므로 무시
  }
}
