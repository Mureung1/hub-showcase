// 상태코드를 실어 던지는 에러 — app.js 공통 에러 핸들러가 { message } + status로 응답한다
export function httpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}
