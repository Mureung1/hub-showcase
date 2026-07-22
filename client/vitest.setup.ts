import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './src/mocks/server.js';
import '@testing-library/jest-dom';

// 모든 테스트 시작 전에 API 모킹 서버 시작
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// 각 테스트 완료 후 모킹 핸들러 상태 초기화 (상태 전염 방지)
afterEach(() => server.resetHandlers());

// 모든 테스트가 종료된 후 서버 클린업 및 리소스 반환
afterAll(() => server.close());
