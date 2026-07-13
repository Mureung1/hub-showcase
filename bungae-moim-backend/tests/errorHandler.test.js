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
});
