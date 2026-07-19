# Task Packet: ARCH-003

## 1. Summary

```text
Task: runtime 하드코딩 제거와 설정·fixture·DB 경계 분리
Backlog ID: ARCH-003
Parent Epic: EPIC-08 / GitHub #63
Type: refactor
Owner: HyunKN
Status: done
```

## 2. Goal

지원 상권·업종·반경처럼 제품이 지원하는 범위를 한 catalog contract에서 관리하고, 실제 분석값은
DB/API에서, demo 값은 fixture에서만 읽도록 경계를 분리한다.

## 3. Scope

포함:

```text
API product catalog 단일 원본과 read-only endpoint
Web catalog loader와 runtime 소비
지원 상권 ID·업종 code·반경 중복 제거
App.tsx의 runtime 통계·점포 fallback 제거
고정 분석 기간을 periods API 정책으로 교체
demo·test fixture를 production runtime import에서 분리
```

제외:

```text
App.tsx 전체 orchestration 분리
분석 UI 컴포넌트 전체 분리
검색·분석 공식 변경
지원 지역과 업종 확대
```

## 4. Related Documents

```text
docs/development/refactoring-standards.md
docs/development/tasks.md
.harness/tasks/REFACTOR-001-full-code-boundaries.md
GitHub #62
```

## 5. Expected Changes

예상 변경 영역:

```text
api: product catalog model과 endpoint, 기존 repository import
web: catalog service/hook, App 초기화와 분석 request
data: 없음
docs: backlog와 run report
tests: catalog contract와 runtime fallback 회귀
scripts: 지원 상권 catalog import
```

## 6. Acceptance Criteria

- [x] 지원 상권 ID·업종 code·반경의 authoritative source가 하나다.
- [x] Web은 `/api/v1/catalog` 응답으로 지원 범위를 구성한다.
- [x] 실제 runtime 화면이 정적 점포·통계 fixture를 fallback으로 사용하지 않는다.
- [x] 분석 기간은 `/api/v1/analysis/periods`의 기본값을 사용한다.
- [x] demo·test fixture가 production runtime module에서 import되지 않는다.
- [x] 기존 검색·지도·분석 동작과 URL 복원이 유지된다.

## 7. Verification Plan

실행할 검증 명령:

```powershell
python scripts/check_code_structure.py --root .
python -m pytest product/apps/api/tests
npm --prefix product/apps/web test
npm --prefix product/apps/web run typecheck
npm --prefix product/apps/web run build
```

수동 확인:

```text
catalog load, 검색 결과 선택, 새로고침 URL 복원, API 실패 상태를 로컬 화면에서 확인한다.
```

현재 진행:

```text
API catalog contract와 Web catalog loader·loading/error hook 구현 완료
App runtime의 지원 상권·업종·반경을 catalog 응답으로 교체
production 화면의 정적 점포·통계 fallback 제거
Web 분석·행정동 service의 상권 ID 중복 제거
분석 기간 확인 전에는 분석 API를 호출하지 않고 periods API의 기본 분기를 사용
URL의 상권·업종·반경 validation도 catalog 범위를 사용
API 분석 endpoint에서 추측한 기본 분기를 제거하고 period를 필수 contract로 변경
score endpoint를 독립 router로 옮겨 main app factory budget을 축소
평가 script도 API catalog를 사용하고 사용되지 않던 demo 점포의 market ID 복제 제거
flower storefront fixture는 실제로 소비하지 않던 상권 ID metadata를 제거
다음 slice에서 전체 검증과 문서 정합성을 확인한 뒤 Task를 마감
```

## 8. Documentation Updates

- [x] 코드/스크립트 변경 시 관련 문서 또는 `.harness` 기록을 같은 커밋에 포함
- [x] README 링크 필요 여부 확인
- [ ] 기능 spec 갱신
- [x] data mapping 갱신
- [x] checklist 갱신
- [x] decision/failure log 필요 여부 확인

## 9. Commit Plan

예상 커밋 메시지:

```text
refactor(catalog): centralize supported product scope

why:
- remove duplicated market, category, and radius policy literals

verify:
- python -m pytest product/apps/api/tests
- npm --prefix product/apps/web test
```

## 10. Self-check

- [x] 한 기능/한 버그/한 문서 단위인가?
- [x] 관련 없는 파일을 변경하지 않았는가?
- [x] 검증 결과를 기록했는가?
- [x] 문서와 체크리스트가 실제 변경과 일치하는가?
- [x] known limitation이 있으면 적었는가?
