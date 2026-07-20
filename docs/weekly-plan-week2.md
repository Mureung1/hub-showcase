# 바로진료 2주차 주간 계획

기간: 2026년 7월 13일 월요일 ~ 7월 17일 금요일

## 이번 주 목표

1. 주간 작업을 GitHub Issues와 Projects에서 추적할 수 있게 한다.
2. Express와 Supabase PostgreSQL의 실제 연결을 완료한다.
3. 환자와 병원 관리자의 핵심 화면을 Express mock API의 공통 대기열 상태로 동작시킨다.

## 작업 관리

- [GitHub Project - 바로진료 개발 대시보드](https://github.com/users/DLSTODAKD/projects/1)
- 상태 View: `Todo`, `In Progress`, `Done` 기준으로 진행 상황 확인
- 요일 View: `요일` 필드 기준으로 월요일부터 금요일까지 일정 확인
- 작업 유형: `PLAN`, `DOC`, `ENV`, `DB`, `BE`, `FE`, `TEST`
- 우선순위: `P0`, `P1`, `P2`

## 요일별 계획

| 날짜 | 상태 | 큰 작업 | GitHub Issue |
|---|---|---|---|
| 7월 13일 월요일 | Done | 기획 문서와 개발 환경 정비 | [#1](https://github.com/DLSTODAKD/hub/issues/1) |
| 7월 14일 화요일 | In Progress | 주간 계획과 Supabase 기반 구성 | [#2](https://github.com/DLSTODAKD/hub/issues/2) |
| 7월 15일 수요일 | Todo | 실제 DB 연결과 백엔드 기반 검증 | [#3](https://github.com/DLSTODAKD/hub/issues/3) |
| 7월 16일 목요일 | Todo | 환자 원격 웨이팅 핵심 화면 | [#4](https://github.com/DLSTODAKD/hub/issues/4) |
| 7월 17일 금요일 | Todo | 관리자 통합 대기열과 주간 검증 | [#5](https://github.com/DLSTODAKD/hub/issues/5) |

## 수요일 완료 목표

- 실제 `DATABASE_URL`을 `apps/api/.env`에 입력한다.
- Supabase Session pooler와 Express의 실제 연결을 확인한다.
- `/api/health/live`와 `/api/health/ready`를 검증한다.
- 시작 재시도, 유휴 연결 오류와 정상 종료 처리를 검증한다.
- DB 연결 Task의 테스트와 문서를 완료한다.

## 목요일 완료 목표

- 병원 선택과 가족 인원 입력을 React 상태로 구현한다.
- mock 원격 웨이팅 등록과 대기 현황을 연결한다.
- 6번째 준비, 4번째 입장 요청과 20분 기한 상태를 표현한다.
- 순서 미루기와 취소가 `useState`로 동작하게 한다.

## 금요일 완료 목표

- 원격·현장 환자가 섞인 관리자 통합 대기열을 구현한다.
- 현장 등록과 도착·호출·보류·취소 상태 변경을 구현한다.
- 환자 모바일 화면과 관리자 데스크톱 화면을 검증한다.
- 완료·미완료 작업을 이슈와 다음 주 계획에 반영한다.

## 범위에서 제외

이번 주 핵심 화면은 서버 없이 mock 데이터로 먼저 검증합니다. 실제 회원가입·인증과 전체 웨이팅 API 연결은 DB 기반과 화면 흐름을 확인한 다음 별도 이슈로 진행합니다.
