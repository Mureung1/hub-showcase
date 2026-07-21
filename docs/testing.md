# 백엔드 테스트 컨벤션

백엔드(`backend/`)의 유닛테스트·통합테스트 작성 규칙입니다. 프론트엔드는 아직 테스트 프레임워크를 도입하지 않았습니다.

- 프레임워크: **Vitest** (`backend/vitest.config.js`) + **Supertest** (라우트 통합테스트)
- 실행: `npm run test:backend` (루트에서), 또는 `backend/`에서 `npm test`
- 위치: `backend/tests/unit/`, `backend/tests/integration/` — 파일명은 `대상.test.js`

---

## 1. 유닛테스트 (`tests/unit/`)

**대상**: 입출력이 결정적인 순수 함수. DB·GitHub API 등 I/O가 없는 로직만 대상으로 한다.

- 예: `src/utils/validators.js`(`isValidGithubId`, `isValidUuid`), `src/services/recommendationService.js`(`judgeDifficulty`, `scoreItem`)
- 컨트롤러의 검증 함수(`isValidPreferences` 등)처럼 파일 내부에 갇혀 있는 순수 함수는, 테스트를 위해 **`export`를 추가**해 직접 호출할 수 있게 한다 (동작 변경 없는 export 추가는 허용 — 참고: `recommendationService.js`의 `judgeDifficulty`/`scoreItem`).
- 서비스 함수 중 DB/GitHub를 호출하는 것(`createRecommendation` 등)은 유닛테스트 대상이 아니다 → 통합테스트로.
- Mock은 최소화한다. Mock이 필요해지는 순간 그 함수는 유닛테스트가 아니라 통합테스트 대상일 가능성이 높다.

```js
import { describe, it, expect } from 'vitest';
import { isValidGithubId } from '../../src/utils/validators.js';

describe('isValidGithubId', () => {
    it('영숫자·하이픈으로 된 정상 GitHub 아이디를 허용한다', () => {
        expect(isValidGithubId('kimsunho2000')).toBe(true);
    });
});
```

참고: `backend/tests/unit/validators.test.js`, `backend/tests/unit/recommendationService.test.js`

---

## 2. 통합테스트 (`tests/integration/`)

**대상**: `app.js`에 마운트된 라우트를 Supertest로 실제 호출해 라우트→컨트롤러→서비스→DB 배선을 검증한다.

### 외부 의존성 처리 원칙
- **GitHub API는 항상 mock한다.** `vi.mock('../../src/services/githubService.js', () => ({ ... }))`로 `searchRepos`/`fetchReposWithIssues`를 대체한다. 실제 호출 시 rate limit 소모·플레이키니스(네트워크 상태에 따라 결과가 바뀜)가 생기기 때문이다.
- **DB는 실제 Supabase(dev와 동일한 `DATABASE_URL`)를 그대로 쓴다.** 별도 테스트 DB를 두지 않는 대신, 스키마·마이그레이션 불일치를 실제로 잡아낼 수 있다는 이점이 있다. 대가로 **테스트가 만든 데이터는 반드시 정리한다**:
  - `beforeAll`에서 필요한 선행 데이터(예: `Analysis` 캐시)를 직접 `prisma.xxx.upsert`로 심는다 — 실제 GitHub 계정에 의존하지 않는 전용 테스트 식별자(예: `vitest-test-user`)를 쓴다.
  - 테스트에서 생성한 레코드의 id를 배열에 모아뒀다가 `afterAll`에서 `deleteMany`로 지운다.
  - `afterAll` 마지막에 `prisma.$disconnect()`로 커넥션을 정리한다.

```js
vi.mock('../../src/services/githubService.js', () => ({
    searchRepos: vi.fn().mockResolvedValue(['octocat/Hello-World']),
    fetchReposWithIssues: vi.fn().mockResolvedValue([/* repo 객체 */]),
}));

const { default: app } = await import('../../app.js');
const { default: prisma } = await import('../../src/config/prisma.js');
```

참고: `backend/tests/integration/recommendations.test.js`

### 검증 범위
- 상태 코드 + 응답 바디의 `error.code`(명세된 에러 코드)까지 확인한다. 상태 코드만 보고 코드값을 안 보면 엉뚱한 에러가 같은 상태 코드로 위장해도 통과해버린다.
- openapi.yaml에 정의된 케이스(정상/빈 결과/400/404)는 최소 하나씩 커버한다.

---

## 3. `api-smoke-test` 스킬과의 역할 분리

- **`api-smoke-test`**(수동, 실제 서버 기동): 실제 GitHub API·실제 배포 환경과 맞물리는 동작을 사람이 눈으로 확인할 때. 새 라우트 완성 시 최소 1회는 여전히 거친다.
- **Vitest 통합테스트**(자동, CI/재실행 가능): 회귀 방지용으로 반복 실행되는 테스트. GitHub는 mock하므로 "실제 배포 환경 확인"은 대체하지 못한다.
- 새 라우트를 추가하면 **둘 다** 한다: 통합테스트로 회귀를 막고, `api-smoke-test`로 실제 동작을 한 번 확인한다.

---

## 4. 하지 말 것
- 유닛테스트에서 DB/네트워크를 실제로 호출하기 (I/O가 필요해지면 통합테스트로 옮긴다).
- 통합테스트에서 GitHub API를 실제로 호출하기 (rate limit 소모, 플레이키니스).
- 통합테스트가 만든 데이터를 정리하지 않고 끝내기 (다음 실행·다른 개발자 조회에 영향).
- 상태 코드만 확인하고 에러 `code`/응답 바디 형태를 확인하지 않기.
