// 학점 수 입력값 검사. 2단계(학점·이해도)와 결과 화면의 "더 자세히" 두 곳에서
// 같은 규칙을 써야 해서 화면 밖으로 뺐다.
export const CREDITS_MIN = 0.5;
export const CREDITS_MAX = 30;

// 빈 값은 "모름"이라 null 로 저장한다. 0 은 모름이 아니라 잘못된 학점이므로 실패로 본다.
// 반환값: { ok: true, value } | { ok: false, message }
export function parseCreditsInput(raw) {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: true, value: null };
  }

  const parsed = Number(raw);
  const isValid = Number.isFinite(parsed) && parsed >= CREDITS_MIN && parsed <= CREDITS_MAX;

  if (!isValid) {
    return {
      ok: false,
      message: `학점 수는 ${CREDITS_MIN}~${CREDITS_MAX} 사이로 입력해 주세요.`,
    };
  }

  return { ok: true, value: parsed };
}
