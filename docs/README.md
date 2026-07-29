# 문서 색인

프로젝트 문서를 4개 카테고리로 묶었다. 각 카테고리 폴더 안의 문서는 서로 상대 경로로 참조하므로,
폴더 단위로 이동하지 않는 한 그대로 둔다.

## [01-알고리즘](01-알고리즘/)

AI + 공공 DB 기반 영양 매칭, 권장량 계산, 광고 추천·리더보드 점수 공식 — "무엇을 어떻게 계산하는가."

- [영양-분석-알고리즘.md](01-알고리즘/영양-분석-알고리즘.md)
- [광고추천-리더보드-알고리즘.md](01-알고리즘/광고추천-리더보드-알고리즘.md)

## [02-디자인](02-디자인/)

Toss 디자인 시스템 적용 규칙(토큰·컴포넌트별 상태·간격/타이포). `/toss` 스킬(`.claude/commands/toss.md`)의
원본 참조 경로다.

- [guidelines.md](02-디자인/guidelines.md) — 전체 원칙
- [foundation/](02-디자인/foundation/) — colors · spacing-radius · typography
- [components/](02-디자인/components/) — action · display · feedback · input · overlay · agreement-keypad

## [03-개발스펙](03-개발스펙/)

아키텍처, 빌드/배포, 테스트 절차, 인터랙션 구현 규칙, PRD — "어떻게 만들고 확인하는가."

- [architecture.md](03-개발스펙/architecture.md) — 시스템 전체 구조(Mermaid)
- [PRD_v2.md](03-개발스펙/PRD_v2.md) — 3주차 기능 개선 PRD (`.claude/commands/PRD_v2_최종.md`와 동일 내용 — 그쪽은 `/PRD_v2_최종` 스킬 명령용 사본이라 의도적으로 유지)
- [PRD_4주차_v2_최종.md](03-개발스펙/PRD_4주차_v2_최종.md) — 4주차 기능 개발 PRD (학식·급식 조회, 직업 기반 추천, AI 식습관 분석)
- [PRD_지도학식탭_UX개선.md](03-개발스펙/PRD_지도학식탭_UX개선.md) — 지도·학식 탭 UX 개선 PRD (학생 식당위치 카드, 주변 식당 5개 제한 + 전체 카테고리 다양화)
- [지도학식탭_UX개선_구현프롬프트.md](03-개발스펙/지도학식탭_UX개선_구현프롬프트.md) — 위 PRD의 코드 레벨 구현 지시 + Gemini 프롬프트 원문
- [PRD_확장기능_v1.md](03-개발스펙/PRD_확장기능_v1.md) — 확장 기능 8종 PRD (물 섭취 체크리스트, 인증샷 카드, 컨페티, 식당 추천 2차원 스코어링, API 캐싱, Meal-Bot 챗봇, 바코드 스캔, 검색 매칭 로컬 폴백)
- [확장기능_구현프롬프트.md](03-개발스펙/확장기능_구현프롬프트.md) — 위 PRD의 코드 레벨 구현 지시 + 사용자가 할 일 체크리스트
- [PRD_확장기능_v2.md](03-개발스펙/PRD_확장기능_v2.md) — 챗봇 IME 버그 수정 + 듀오링고식 게이미피케이션(레벨/XP, 퀘스트 게시판, 홈 화면 실시간 애니메이션, 뱃지·도감) PRD
- [게이미피케이션_구현프롬프트.md](03-개발스펙/게이미피케이션_구현프롬프트.md) — 위 PRD의 코드 레벨 구현 지시 + 확인 필요 지점 + 사용자가 할 일 체크리스트
- [PRD_확장기능_v3.md](03-개발스펙/PRD_확장기능_v3.md) — 듀오링고식 리텐션 강화 8종(레벨업 팝업 강화, XP 리더보드, 퀘스트 일간/주간 로테이션, 식단 퀴즈, 지도 듀얼 비교, 커스텀 조합 빌더, 동적 수분 목표, 보안 질문 비밀번호 찾기) PRD
- [리텐션강화_구현프롬프트.md](03-개발스펙/리텐션강화_구현프롬프트.md) — 위 PRD의 코드 레벨 구현 지시 + 확인 필요 지점 + 사용자가 할 일 체크리스트
- [apk-build-guide.md](03-개발스펙/apk-build-guide.md) — Capacitor APK 빌드
- [interaction-guide.md](03-개발스펙/interaction-guide.md) — 모션/인터랙션 구현 규칙
- [csv-crossplatform-test.md](03-개발스펙/csv-crossplatform-test.md) — CSV 백업 크로스플랫폼 테스트 절차
- [univ-meal-update.md](03-개발스펙/univ-meal-update.md) — 대학 학식 폴백 JSON(server/data/univ-meals.json) 매주 갱신하는 법
- [next-쿠팡API-자동추천-프롬프트.md](03-개발스펙/next-쿠팡API-자동추천-프롬프트.md) — (보류 중) 쿠팡 상품 자동 수집 설계

## [04-프로젝트설명](04-프로젝트설명/)

프로젝트 배경·히스토리·현재 상태 — "무엇을, 왜 만들었는가."

- [프로젝트-소개.md](04-프로젝트설명/프로젝트-소개.md) — 개요, 차별점, 개발 히스토리, 회고
- [cost-analysis.md](04-프로젝트설명/cost-analysis.md) — Gemini API 비용 분석
- [week3-release-checklist.md](04-프로젝트설명/week3-release-checklist.md) — 배포 전 점검 리포트

---

루트의 `README.md`(설치·배포·환경변수)와 `CHANGELOG.md`(변경 이력), `CLAUDE.md`(Claude Code용
코드베이스 가이드)는 관례상 저장소 최상위에 그대로 둔다.
