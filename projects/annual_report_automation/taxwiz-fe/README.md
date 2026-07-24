# taxwiz-fe

React + TypeScript + Vite. `annual_report_automation`의 프론트엔드 트랙 — 아직 커밋되지 않은
작업 중 상태로 발견됨(2026-07-20, BE/DB 세션에서 확인).

## ⚠️ 확인 필요 — 지금 이 앱이 뭘 하는지

지금 구현된 건 **부가가치세(VAT) 계산 마법사** 하나뿐이다(`src/scenarios/vatScenario.ts`,
간이/일반과세자 문답 → `src/utils/taxCalculator.ts`가 클라이언트에서 직접 계산). 반면
`../taxengine`(이 저장소의 Python 백엔드)은 **법인세 조정**(재무상태표·손익계산서·자산대장·
세무조정 → 별지3 세액, `PLAN.md`·`CHECKLIST.md` 참고)을 다룬다 — **다른 세금, 다른 입력
구조**다. 둘 사이에 API 호출이 하나도 없어 지금은 완전히 독립된 앱이다.

FE 작업을 다시 시작하면 먼저 확정할 것:

1. 이 부가세 계산기가 계속될 트랙인지, 아니면 애초 목표(`CHECKLIST.md` "확장(2차)" —
   소상공인이 법인세 조정 데이터를 입력하는 화면)로 방향을 바꿀지.
2. 법인세 조정 입력 화면이 맞다면, 입력 필드는 `data/templates/*.csv`(company·balance_sheet·
   income_statement·assets·cars·adjustments·answer)의 한글 필드명과 구조를 그대로 따라가면
   된다 — `taxengine/db/schema.sql`이 이미 그 필드들을 DB 컬럼으로 매핑해뒀다
   (`../docs/research/DB-스키마-설계.md`).

## TODO — BE 연결 (FE 완성 후 진행)

- [x] **API 서버 완성**(2026-07-20) — `taxengine/api/main.py`(FastAPI). 기동: `python -m taxengine.api.main`
      → `http://127.0.0.1:8000`, 자동 문서는 `/docs`. 엔드포인트:
      `POST /companies` · `GET /companies` · `POST /companies/{id}/fiscal-years` ·
      `GET /companies/{id}/fiscal-years` · `GET /fiscal-years/{id}` ·
      `POST /fiscal-years/{id}/calculate` · `GET /fiscal-years/{id}/snapshots`.
      요청 바디 필드명은 `data/templates/*.csv`의 한글 헤더와 1:1(`taxengine/api/schemas.py` 참고).
- [ ] FE 입력 폼 → 위 API로 실제 fetch 호출 연결 (지금은 "연결 지점만" 있고 FE 쪽에서 안 씀)
- [ ] CORS(`allow_origins=["*"]`)를 실제 FE origin으로 좁히기 — `taxengine/api/main.py` 상단 TODO 참고
- [ ] 계산 결과·정답지 대조를 화면에 표시

API 자체는 완성됐고(`tests/test_api.py` 6개, 실제 uvicorn 서버로도 스모크 테스트 완료), FE에서
fetch로 호출하는 코드만 아직 없다. 방향(부가세 계산기 vs 법인세 조정 입력화면, 위 참고)이
확정되면 그때 연결한다.

---

## (Vite 기본 템플릿 안내 — 원본 그대로 보존)

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
