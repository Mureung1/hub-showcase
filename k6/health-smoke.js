import http from 'k6/http';
import { check, fail } from 'k6';

const externalMode = __ENV.PLACEPICK_EXTERNAL_MODE || '';
const baseUrl = (__ENV.BASE_URL || 'http://dev:8080').replace(/\/$/, '');
const allowedBaseUrl = /^http:\/\/(dev|host\.docker\.internal|localhost|127\.0\.0\.1)(:\d+)?$/;

if (externalMode !== 'mock') {
  throw new Error('load smoke is fail-closed: PLACEPICK_EXTERNAL_MODE must be mock');
}

if (!allowedBaseUrl.test(baseUrl)) {
  throw new Error(`load smoke only accepts a local Compose endpoint; received ${baseUrl}`);
}

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate==0'],
  },
};

export default function () {
  const response = http.get(`${baseUrl}/actuator/health`, {
    timeout: '5s',
    tags: { endpoint: 'actuator-health' },
  });

  let body = null;
  try {
    body = response.json();
  } catch (error) {
    fail(`health endpoint did not return JSON: ${error.message}`);
  }

  check(response, {
    'health returns HTTP 200': (res) => res.status === 200,
    'health reports UP': () => body && body.status === 'UP',
  });
}
