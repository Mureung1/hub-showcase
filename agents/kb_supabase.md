# KB: Supabase (홈키퍼 DB 정보)

> 이 문서는 프로젝트의 Supabase 관련 정보를 모아둔 지식베이스다.
> ⚠️ 실제 비밀 키(service_role 등)는 여기 적지 않는다. .env 파일에만 둔다.
>    여기엔 "어디서 어떻게 찾는지"만 기록한다.

## 프로젝트 기본 정보
- 프로젝트명: homekeeper
- 요금제: Free
- 지역(Region): Northeast Asia (Seoul)
- 대시보드: https://supabase.com/dashboard
- Project URL: https://xvpuvhfszvmjbuvfrvrx.supabase.co

## API 키 (값은 여기 안 적음)
- 사용할 키: **Legacy service_role 키** (서버 전용, 강력한 권한)
- 찾는 경로: 대시보드 → Settings(⚙️) → API Keys
           → "Legacy anon, service_role API keys" 탭 → service_role
- 이유: 서버(Express)에서만 쓰고, 자료·예제가 많은 Legacy 방식 채택
- ⚠️ 이 키는 .env 파일에만 넣고, git에 절대 커밋하지 않는다.

## expenses 테이블 구조
지출 항목을 저장하는 테이블. RLS는 개발 단계라 꺼둠(나중에 켤 것).

| 컬럼 | 타입 | 설명 | 비고 |
|------|------|------|------|
| id | int8 | 항목 고유 번호 | 자동 증가 (DB가 채움) |
| name | text | 항목 이름 (관리비) | |
| amount | int8 | 금액 (120000) | 원 단위 정수 |
| due_day | int2 | 납부일 (매월 25일 → 25) | 1~31 |
| type | text | 고정/변동 구분 | mock 단계선 미사용 |
| category | text | 분류 (주거 등) |