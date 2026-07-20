# 사용 설명서 — 세무조정 엔진 (프론트엔드 없음, 터미널로 사용)

> 아직 화면 UI는 없습니다. 지금은 **CSV 입력 → 터미널에서 재현**하는 방식입니다. (백엔드: Python)
> ⚠️ 이 CSV 입력 방식은 과도기입니다 — 타깃 사용자(소상공인)는 세무 지식·엑셀 능숙도가 낮아
> 별도 **프론트엔드 웹 입력 화면**을 만들 예정입니다(2026-07-20 결정). 지금 이 문서는 엔진을
> 개발·검증하는 동안 쓰는 방법이고, 실제 사용자용 입력 경로는 아닙니다.

## 0. 준비 (최초 1회)

```bash
cd projects/annual_report_automation
python --version      # 3.11 이상이어야 함
```

계산 엔진 자체는 설치할 것 없음 — 의존성 0개(`python` 표준 라이브러리만). **Excel 출력**
(`cli.export`)만 `openpyxl`이 필요합니다 — 없으면 `pip install openpyxl` (또는 `pip install -e .`).

## 1. 잘 돌아가는지 먼저 확인

```bash
python -m unittest discover -s tests       # 엔진 검증 87개 — 전부 ok 나오면 정상
python -m taxengine.cli.reproduce          # 예시 데이터로 재현 → "재현 성공" 나오면 정상
```

> Windows에서 한글이 깨지면 앞에 `set PYTHONIOENCODING=utf-8 &&` (cmd) 또는
> `$env:PYTHONIOENCODING="utf-8";` (PowerShell)를 붙이세요.

## 2. 내 법인 데이터로 사용하기

### (1) 템플릿 복사

```bash
mkdir -p data/private/fy2025
cp data/templates/*.csv data/private/fy2025/
```

### (2) 종이책 보고 CSV 채우기

`data/private/fy2025/`의 6개 파일을 엑셀로 열어 종이책 값으로 바꿉니다.

| 파일 | 종이책에서 어디를 보나 |
|---|---|
| `company.csv` | 별지1 표지 + 중소기업 기준검토표 (사업연도·중소기업 여부·수입금액) |
| `balance_sheet.csv` | 재무상태표 |
| `income_statement.csv` | 손익계산서 |
| `assets.csv` | 유형자산감가상각비명세서 |
| `adjustments.csv` | 소득금액조정합계표 (개별 조정 항목) |
| `answer.csv` | **별지3** 세액 — 채점용 정답지 |
| `cars.csv` (선택) | 업무용승용차 관련비용 명세서 — 있으면 한도를 자동 계산, 없으면 생략 |

> `company.csv`에 `수입금액`을 채우면 기업업무추진비 한도도 자동 계산됩니다(적격증빙 없는 지출액만
> `기업업무추진비_증빙불비금액`에 별도 입력). 채우지 않으면 예전처럼 `adjustments.csv`에 최종
> 금액을 직접 적어도 됩니다 — 둘 다 하위호환됩니다.

⚠️ **개인정보는 마스킹**: 주민번호는 입력 안 함, 이름→`대표A`, 거래처→`거래처01`. 금액·날짜만 진짜 값. (자세히: `data/README.md`)

### (3) 재현 실행

```bash
python -m taxengine.cli.reproduce --dir data/private/fy2025
```

### (4) 두 해를 이어서 검증하기 (자동이월) ★

2024·2025 두 책자가 있으면, 2024를 먼저 넣고 2025를 넣은 뒤 **연도 간 이월이 맞는지** 검사할 수 있습니다.

```bash
# 각각 폴더로 (예: data/private/fy2024, data/private/fy2025)
python -m taxengine.cli.reproduce --dir data/private/fy2025 --prev data/private/fy2024
```

`--prev`를 주면 맨 앞에 **[0] 연도 간 이월 연속성**이 나옵니다. 검사하는 것:
- 2025 자산의 **기초누계** = 2024 기초누계 + 2024 계상액인가
- 2025 자산의 **전기이월부인액(유보)** = 2024까지 누적된 부인액인가
- 2025 **이월결손금** = 2024에서 넘어온 값인가

하나라도 어긋나면 "이월이 어긋난다"고 멈춥니다 — **두 해 사이의 입력 오류(연도 밀림·오타)를 잡는 장치**입니다.
돌려보려면: `python -m taxengine.cli.reproduce --dir data/example-2y/2025 --prev data/example-2y/2024`

## 3. 결과 읽는 법

```
[1] 입력 무결성 검증   ← ✗ 가 있으면 CSV 오타. 종이책과 다시 대조
[2] 감가상각 시부인
[3] 소득금액조정합계표
[4] 별지3 세액조정계산서  ← 엔진이 계산한 세금
[5] 종이책 정답지 대조   ← ✅ 재현 성공 = 종이책과 원단위 일치
```

**불일치(✗)가 나오면** 셋 중 하나입니다:
- ⓐ 내가 CSV를 잘못 입력 → 종이책과 다시 대조
- ⓑ 엔진 로직 오류 → 김진영 님께 알려주세요
- ⓒ 세무사 판단이 개입된 항목 → 재현 안 되는 게 정상

## 4. 절세 시나리오 · Excel 출력

```bash
python -m taxengine.cli.scenario --dir data/private/fy2025          # 감가상각 방법·내용연수 비교표
python -m taxengine.cli.export   --dir data/private/fy2025 --out 결과.xlsx  # 근거 각주 붙은 xlsx
```

- `scenario`: 자산별로 적법하게 고를 수 있는 감가상각 방법·내용연수 조합을 전부 계산해 세액이 낮은
  순으로 보여줍니다. ⚠️ 여기 나오는 모든 조합은 **과세이연형**입니다 — 세금을 앞당기거나 미루는
  것뿐이지 총 부담이 줄어드는 게 아닙니다. "추천"이 아니라 비교표만 보여주니 최종 선택은 세무사와
  상의하세요.
- `export`: 별지3·감가상각시부인·기업업무추진비·업무용승용차·정답대조를 시트별로 나눠 xlsx로
  저장합니다. 숫자마다 "이 값이 어디서/어느 조문에서 왔는지" 각주가 붙어 있습니다.

## 5. 자주 겪는 것

- **`data/private/`는 git에 안 올라갑니다** (개인정보 보호). 안심하고 실데이터를 넣으세요.
- **Python이 없다면**: [python.org](https://python.org)에서 3.11 이상 설치.
- **여러 해를 하려면**: `data/private/fy2024`, `fy2026` 식으로 폴더만 나누면 됩니다.
