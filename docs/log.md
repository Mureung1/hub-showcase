# 작업 로그 (Log)

날짜별로 진행한 작업, 이슈, 다음 할 일을 기록합니다.

## 템플릿
### YYYY-MM-DD
- 진행한 작업:
- 이슈/막힌 점:
- 다음 할 일:

---

### 2026-07-13
- 진행한 작업:
  - 주간 계획 수립 → GitHub 이슈 #1~#5 등록 (날짜별, 토·일 제외)
  - DB 전환 결정: MongoDB → Supabase(PostgreSQL) + Prisma ([decisions.md](decisions.md) 기록). Spring Boot 검토 후 Node.js 유지 결정도 기록
  - 이슈 #1 완료: API 명세 4개 확정 — [openapi.yaml](openapi.yaml) 작성(공통 에러 형식, 활동 없는 사용자 200 빈 분석), [architecture.md](architecture.md) 요약표
  - 이슈 #2 완료: Express 스캐폴딩 — `server/` 독립 패키지, 레이어드 구조, `/health`, 404·500 공통 에러 핸들러, winston 로거, `/api-docs` Swagger 서빙(파일 부재 폴백)
  - 노션 태스크 보드 동기화 (FE 완료분 9개 체크, 스택 변경 반영)
- 이슈/막힌 점:
  - main은 대회 운영진(crong) 관리 브랜치 → 직접 푸시 금지, 원격 반영은 `N034_김선호` 브랜치로 확정
  - 원격 N034 브랜치에 auto-merge 봇 커밋이 쌓여 있어 pull 머지 후 푸시 필요했음
- 다음 할 일:
  - (화) 이슈 #3: FE mock 데이터 연결 — openapi.yaml example에서 mock JSON 생성, 빈 분석 mock 포함
  - (화) 이슈 #4: Supabase 프로젝트 생성 + Prisma 스키마 6테이블 (`prisma migrate dev`)
  - (수~금) 이슈 #5: 프로필 분석 API — GitHub 토큰 발급부터
