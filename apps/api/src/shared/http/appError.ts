/**
 * 애플리케이션 오류 — HTTP status + 에러 봉투 code/message (SPEC-AUTH-003 3장).
 * Controller가 잡아서 shared 에러 봉투로 내려준다. 메시지에 비밀값·내부 스택은 넣지 않는다.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Postgres SQLSTATE 를 담을 수 있는 오류 형태(supabase-js PostgrestError 등). */
function pgCode(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

/**
 * DB 오류를 사용자용 AppError로 변환한다.
 * - 23505(unique_violation): 미완료 Question Partial Unique 위반 → 409 QUESTION_ALREADY_OPEN
 * - 42501(insufficient_privilege) / RLS 위반: 소유하지 않은 Chat → 404 CHAT_NOT_FOUND(정보 은닉)
 * - 그 외: 그대로 던져 상위에서 500 처리
 */
export function mapDbError(error: unknown): AppError | null {
  const code = pgCode(error);
  if (code === "23505") {
    return new AppError(
      409,
      "QUESTION_ALREADY_OPEN",
      "이미 진행 중인 질문이 있습니다. 먼저 완료해주세요.",
    );
  }
  if (code === "42501") {
    return new AppError(404, "CHAT_NOT_FOUND", "대상 Chat을 찾을 수 없습니다.");
  }
  return null;
}
