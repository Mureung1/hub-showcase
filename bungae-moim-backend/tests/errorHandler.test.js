const express = require('express');
const request = require('supertest');
const ApiError = require('../src/utils/apiError');
const errorHandler = require('../src/middleware/errorHandler');

function buildTestApp() {
  const app = express();
  app.get('/throw-api-error', (req, res, next) => {
    next(new ApiError('VALIDATION_ERROR', '잘못된 입력입니다'));
  });
  app.get('/throw-generic-error', (req, res, next) => {
    next(new Error('unexpected'));
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('ApiError를 공통 포맷 + 올바른 status로 변환한다', async () => {
    const res = await request(buildTestApp()).get('/throw-api-error');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: '잘못된 입력입니다' },
    });
  });

  it('일반 Error는 500 + INTERNAL_ERROR로 변환한다', async () => {
    const res = await request(buildTestApp()).get('/throw-generic-error');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  // 예상 못 한 에러의 원문에는 내부 사정이 담긴다 — 실제로 길이 초과 시
  // "character varying(100) 자료형에 너무 긴 자료를..."이라는 Postgres 메시지가
  // 그대로 클라이언트까지 나갔다. 원문은 서버 로그에만 남기고 응답은 일반 문구로 준다.
  it('일반 Error의 원문 메시지를 응답에 노출하지 않는다', async () => {
    const res = await request(buildTestApp()).get('/throw-generic-error');
    expect(res.body.error.message).not.toBe('unexpected');
    expect(res.body.error.message).not.toContain('unexpected');
  });

  it('예상 못 한 에러는 서버 로그에 남긴다(조사 단서를 잃지 않도록)', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await request(buildTestApp()).get('/throw-generic-error');

    expect(spy).toHaveBeenCalled();
    // 로그에는 원문이 남아 있어야 한다.
    expect(spy.mock.calls.flat().some((arg) => String(arg && arg.message).includes('unexpected'))).toBe(true);
    spy.mockRestore();
  });
});
