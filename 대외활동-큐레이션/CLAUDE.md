# CLAUDE.md - 대외활동 큐레이션

내 조건에 맞는 대외활동, 공모전, 장학, 봉사만 골라주는 서비스. 이 파일은 개발할 때 참고할 맥락이다.
개발은 2주차에 본격적으로 하고, 지금은 환경과 규칙만 정해 둔다.

관련 문서
- 기획서(위키): https://github.com/jaeho9338-code/activity-curation/wiki
- 데이터 수집 방식: docs/데이터-수집.md
- 자격 스키마 / API 계약: docs/schema.md
- 디자인 시스템: design/시안.html 과 .claude/skills/curation-design 스킬

## 스택

- 프론트: React (Vite)
- 백: Express (Node)
- 데이터: Supabase (Postgres, 자격요건은 JSONB로)
- 수집: 정적 HTML 스크래핑, 새벽 배치
- 파싱: OpenAI (자격요건 자유 문장을 조건으로 구조화)

## 디렉토리 구조

```
activity-curation/
  src/             React 앱 (Vite). 지금은 root가 곧 client다.
  server/          Express (스캐폴드 생성됨, 다음주에 stub 채우기)
    routes/        조회 API (GET /postings 등, docs/schema.md 참조)
    scrapers/      소스별 수집기 (wevity.js 부터, 하나씩 끼움)
    parser/        LLM 자격요건 파서
    batch/         새벽 배치 (스케줄)
    db/            Supabase 클라이언트, 쿼리
  docs/            기획서, 데이터 수집, 스키마
  design/          디자인 시안
  .claude/skills/  디자인 스킬
```

프론트를 client/ 폴더로 옮기는 건 나중에. 프로토타입 단계에선 root를 client로 둔다.

## 라이브러리 (왜 쓰는지)

- 프론트: react, react-dom, react-router-dom(화면 이동). 스타일은 디자인 토큰 CSS로 가볍게, UI 라이브러리는 안 쓴다.
- 백: express(서버), cors, dotenv(키 관리), @supabase/supabase-js(DB), cheerio(정적 HTML 파싱), node-cron(배치), openai(파싱).
- 개발: vite, nodemon(서버 자동 재시작), oxlint(이미 씀).
- 원칙: 꼭 필요한 것만 넣는다. 안 쓸 라이브러리를 미리 안 깐다.

## 컨벤션

- 컴포넌트 파일은 PascalCase, 나머지는 소문자.
- 색과 간격은 디자인 토큰만 쓴다. 임의 색 금지. (.claude/skills/curation-design 의 색 토큰 참조)
- API는 docs/schema.md 의 계약을 따른다.
- 화면은 로딩, 빈 상태, 에러 상태를 항상 처리한다.
- 비밀키는 .env 로만 관리한다. 절대 커밋하지 않는다.

## 커밋 규칙

- 작게 쪼갠다. 한 커밋은 한 가지 일만.
- 메시지는 한글로, 무엇을 왜 했는지 적는다. 긴 대시 기호는 안 쓴다.
- 개인정보(이름, 전화, 이메일)와 키는 커밋하지 않는다.

## 개발할 때

- 남이 짜준 걸 그대로 붙이지 않는다. 자바스크립트와 CSS 기본을 짚으며 이해하고 넘어간다.
- 서두르지 않는다. 핵심인 자격 매칭부터 되는지 확인하고 넓힌다.

## 확정한 설계 결정 (다음주 생각 없이 시작하려고)

- 매칭은 서버에서 한다. 유저가 조회하면 GET /postings에 프로필을 쿼리로 주고, 서버가 완성본(postings)을 프로필과 대조해 가능, 불가, 확인 필요로 나눠 페이지 단위로 돌려준다. 브라우저가 수천 건을 받아 도는 구조가 아니다. 프로토타입은 서버 메모리에서 필터링하고, 데이터가 커지면 Postgres JSONB 조건 쿼리로 옮긴다.
- 신선도는 새벽 1회 배치가 MVP다. 원천보다 한 박자 느리다는 걸 인정하고, 카드에 수집 시각을 표시하고 마감 임박을 강조한다. 더 잦은 갱신은 나중에 마감 임박 공고 위주로 붙인다.
- LLM 비용은 신규나 변경분만 파싱하고, 위비티가 구조로 주는 값(분야, 응모대상)은 규칙으로 매핑해 호출을 줄여 통제한다. 저렴한 모델로 공고당 분류와 추출 2콜. 하루 신규 수백 건이면 대략 하루 1달러 안쪽으로 본다. 정확한 값은 키가 생기면 실측한다.
