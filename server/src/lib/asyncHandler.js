// Express 4는 async 핸들러의 reject를 잡지 못한다 — next로 전달해 공통 에러 핸들러로 보낸다
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
