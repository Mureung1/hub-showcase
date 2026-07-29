# 데모 시드 실행 절차

생성 데이터(`dataset_version = ds_demo_v1`)를 만들고 Supabase 에 넣고 되돌리는 절차다.
데이터 규약은 [`CONTRACT.md`](./CONTRACT.md) 에 있다.

## 폴더

| 경로 | 내용 | 만드는 것 |
| --- | --- | --- |
| `parts/<job_role_id>/<table>.csv` | 직무 아홉 종의 조각 | `scripts/demo_seed/<job_role_id>.py` |
| `parts/user_postings/<table>.csv` | 사용자 입력 샘플 공고 조각 | `scripts/demo_seed/user_postings.py` |
| `sample_postings/<job_role_id>.txt` | 화면에 붙여 넣을 공고 원문 | `scripts/demo_seed/user_postings.py` |
| `<table>.csv` | 조각을 합친 적재용 파일 | `scripts/build_demo_seed.py` |

## 명령

PowerShell 기준이다. `&&` 를 쓰지 않고 한 줄씩 실행한다.
`cd` 로 옮기는 폴더를 각 단계에 적었다.

### 0. 준비 (실행 폴더 `hub\agent`)

```powershell
cd hub\agent
```

```powershell
.\.venv\Scripts\Activate.ps1
```

### 1. 조각 만들기 (실행 폴더 `hub\agent`)

직무 조각은 갈래마다 따로 만든다. 아홉 직무를 한 줄씩 돌린다.

```powershell
python -m scripts.demo_seed.backend
```

```powershell
python -m scripts.demo_seed.user_postings
```

### 2. 합치기 (실행 폴더 `hub\agent`)

조각을 `data\demo_seed\<table>.csv` 로 합친다. 데이터베이스에 접속하지 않는다.

```powershell
python scripts\build_demo_seed.py
```

파일을 쓰지 않고 중복만 보려면 이렇게 한다.

```powershell
python scripts\build_demo_seed.py --check
```

아직 없는 조각은 건너뛰고 무엇을 건너뛰었는지 마지막에 찍는다.
기본키가 겹치면 어느 조각끼리 겹쳤는지 밝히고 멈춘다.

### 3. 검사 (실행 폴더 `hub\agent`)

접속하지 않고 CSV 의 헤더 순서와 칸 수만 본다.

```powershell
python scripts\load_demo_seed.py --dry-run
```

### 4. 적재 전 점검 (실행 폴더 `hub\agent`)

접속해서 읽기만 한다. 실 데이터와 부딪히는 기본키·유일 제약을 미리 찾고,
채택으로 풀리는 것과 적재를 막는 충돌을 갈라 보여 준다.

```powershell
python scripts\load_demo_seed.py --preflight
```

### 5. 적재 (실행 폴더 `hub\agent`)

접속 한 번, 거래 하나로 표마다 `COPY` 를 한 번씩 실행한다.
접속 문자열은 `agent\.env` 의 `SUPABASE_DB_URL` 에서만 읽는다.

```powershell
python scripts\load_demo_seed.py
```

### 6. 되돌리기 (실행 폴더 `hub\agent`)

`dataset_version = 'ds_demo_v1'` 이거나 `analysis_version LIKE 'an_demo_%'` 인 행만
적재의 역순으로 지운다. 확인 문자열로 `ds_demo_v1` 을 그대로 입력해야 진행한다.

```powershell
python scripts\load_demo_seed.py --rollback
```

확인을 묻지 않으려면 `--yes` 를 함께 준다.

```powershell
python scripts\load_demo_seed.py --rollback --yes
```

## 안전 장치

- **실 데이터 보호 목록**: `job_roles`, `companies`, `company_clusters`,
  `company_cluster_memberships`, `periods`, `metric_templates`,
  `metric_template_parameters`, `metric_policy_versions`, `ontology_versions`,
  `standards` 는 쓰지도 지우지도 않는다. `load_demo_seed.py` 의 `PROTECTED_TABLES` 가
  import 시점에 적재 순서·삭제 순서와 겹치지 않는지 검사한다.
- 조건 없는 `DELETE` 가 하나도 없다. 모든 삭제 조건이 위 두 표시로 되짚어진다.
- `source_snapshots`·`source_observations`·`agent_runs` 는 추가 전용 트리거가 삭제를
  막는다. 되돌리기 동안만 `ALTER TABLE ... DISABLE TRIGGER USER` 로 내리고 `finally`
  에서 다시 올린다.
- 생성 스크립트는 데이터베이스에 접속하지 않는다. 모델도 부르지 않는다.

## 검증

```powershell
python -m pytest tests\unit\test_demo_seed_build.py -q
```
