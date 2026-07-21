// Express 4는 async 핸들러 안에서 던진(reject된) 에러를 자동으로 못 잡는다.
// 이걸로 감싸면 reject를 next(err)로 넘겨서 기존 errorHandler가 그대로 처리한다.
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
