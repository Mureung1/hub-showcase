# 작업 분해 체크리스트

다음주엔 위에서부터 순서대로 체크만 하면 된다. 각 항목은 대략 1커밋. 결정은 다 끝났다.
설계 단일 소스는 docs/schema.md, 수집 세부는 docs/데이터-수집.md, 전체 맥락은 CLAUDE.md.

## 0. 준비 (10분)
- [ ] root에서 `npm install`, `cd server && npm install`
- [ ] server/.env 만들기 (.env.example 복사, Supabase와 OpenAI 키 채우기)
- [ ] Supabase 프로젝트 만들고 URL과 key 넣기

## 1. 데이터 뼈대
- [ ] Supabase에 테이블 생성 (schema.md 부록1: profiles, sources, raw_postings, postings, parse_logs)
- [ ] server/db/supabase.js: 클라이언트 연결
- [ ] sources에 위비티 한 줄 넣기

## 2. 수집기 (위비티)
- [ ] server/scrapers/wevity.js: 목록 페이지 gp 넘겨가며 ix와 상세 주소 모으기 (데이터-수집.md 페이지네이션 규칙)
- [ ] 상세 페이지에서 제목, 분야, 응모대상, 접수기간, 참가조건 뽑기
- [ ] raw_postings에 저장 (source_url 유일 키로 중복 방지)
- [ ] 요청 사이 3초, User-Agent 명시

## 3. 파싱 (구조값 + LLM)
- [ ] 분야 태그 -> majors 매핑표 코드로 (schema.md 정규화 규칙)
- [ ] 접수기간 -> deadline 파싱 (없으면 null)
- [ ] server/parser/extract.js: 참가조건 raw_text를 OpenAI로 분류와 추출 (schema.md 프롬프트와 JSON)
- [ ] 넓은 표현 펼치기 (이공계 -> [과학, IT, 의학] 등)
- [ ] postings에 완성본 저장, 실패와 저신뢰는 needs_review로 격리 (parse_logs 기록)

## 4. 배치
- [ ] server/batch/daily.js: 수집 -> 파싱 -> 저장 한 번에
- [ ] 새벽 스케줄 (node-cron), 중복은 source_url로 덮어쓰기
- [ ] 깨짐 감지 (0건이거나 빈 필드 급증하면 알림)

## 5. 조회 API
- [ ] server/routes/postings.js: GET /postings (프로필 쿼리로 가능, 불가, 확인 필요 분류 + 페이지)
- [ ] 매칭 로직 (schema.md 핵심 규칙: 포함관계, 안 고름은 계산 제외, 나이 포함)
- [ ] GET /postings/:id, GET과 PUT /profile

## 6. 화면 (React, design/시안 기준)
- [ ] 조건 입력 폼 (학년, 전공 8, 지역 13, 재학상태, 나이, 장학 토글로 소득과 학점)
- [ ] 결과 목록: 가능, 확인 필요, 거의 가능(조건 1개 차이) 카드, API 연결
- [ ] 카드에 근거, 마감일, 수집 시각
- [ ] 불가 사유 자리에서 프로필 수정하면 즉시 재매칭
- [ ] 빈, 로딩, 에러 상태

## 7. 정확도 확인
- [ ] 실제 공고 50건 gold 라벨
- [ ] 파서 결과와 gold 비교로 정밀도와 재현율
- [ ] 기준 미달이면 프롬프트와 매핑표 수정
