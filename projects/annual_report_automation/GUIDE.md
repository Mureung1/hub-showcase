# 사용 설명서 — 세무조정 엔진 (프론트엔드 없음, 터미널로 사용)

> 아직 화면 UI는 없습니다. 지금은 **CSV 입력 → 터미널에서 재현**하는 방식입니다. (백엔드: Python)

## 0. 준비 (최초 1회)

```bash
cd projects/annual_report_automation
python --version      # 3.11 이상이어야 함
```

설치할 것 없음 — 의존성 0개. `python`(표준 라이브러리)만 있으면 됩니다.

## 1. 잘 돌아가는지 먼저 확인

```bash
python -m unittest discover -s tests       # 엔진 검증 27개 — 전부 ok 나오면 정상
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
| `company.csv` | 별지1 표지 + 중소기업 기준검토표 (사업연도·중소기업 여부) |
| `balance_sheet.csv` | 재무상태표 |
| `income_statement.csv` | 손익계산서 |
| `assets.csv` | 유형자산감가상각비명세서 |
| `adjustments.csv` | 소득금액조정합계표 (개별 조정 항목) |
| `answer.csv` | **별지3** 세액 — 채점용 정답지 |

⚠️ **개인정보는 마스킹**: 주민번호는 입력 안 함, 이름→`대표A`, 거래처→`거래처01`. 금액·날짜만 진짜 값. (자세히: `data/README.md`)

### (3) 재현 실행

```bash
python -m taxengine.cli.reproduce --dir data/private/fy2025
```

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

## 4. 자주 겪는 것

- **`data/private/`는 git에 안 올라갑니다** (개인정보 보호). 안심하고 실데이터를 넣으세요.
- **Python이 없다면**: [python.org](https://python.org)에서 3.11 이상 설치.
- **여러 해를 하려면**: `data/private/fy2024`, `fy2026` 식으로 폴더만 나누면 됩니다.
