"""
Weekday / Hourly Sales 패턴 파서
- 원본은 상품 단위가 아닌, 카테고리 x 주차 단위로 이미 집계된 매트릭스
- 각 시트 2행("조회기간")만 유효 데이터. 3행("비교기간")은 2행과 동일값,
  4행("차이")은 항상 0이라 사용하지 않음
- 4주치(06월 w1~w4)를 카테고리별로 평균 내어 저장
"""

import pandas as pd
from pathlib import Path

CATEGORIES = ["김밥", "도시락", "주먹밥", "햄버거샌드위치"]
WEEKS = ["w1", "w2", "w3", "w4"]
WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"]


def _cell_to_float(value) -> float:
    """빈 셀(매출 없음)은 0으로 처리"""
    return float(value) if pd.notna(value) else 0.0


def parse_weekday_file(file_path: str) -> list[float]:
    """weekday_sales 파일에서 조회기간 행(월~일, 7개)만 추출"""
    df = pd.read_excel(file_path, sheet_name=0, header=None)
    row = df.iloc[1]  # 3번째 행 (0-indexed) = "조회기간"
    return [_cell_to_float(row.iloc[i]) for i in range(2, 9)]  # C~I 열 = 월~일


def parse_hourly_file(file_path: str) -> list[float]:
    """hourly_sales 파일에서 조회기간 행(00시~23시, 24개)만 추출"""
    df = pd.read_excel(file_path, sheet_name=0, header=None)
    row = df.iloc[1]  # "조회기간" 행
    return [_cell_to_float(row.iloc[i]) for i in range(2, 26)]  # C~Z 열 = 00시~23시


def parse_pattern(kind: str) -> pd.DataFrame:
    """kind: 'weekday' | 'hourly' — 카테고리별 4주 평균 계산"""
    base_path = Path(f"data/raw/{kind}_sales")
    parse_fn = parse_weekday_file if kind == "weekday" else parse_hourly_file

    rows = []
    for category in CATEGORIES:
        weekly_values = []
        for week in WEEKS:
            file_path = base_path / f"{kind}_sales_06_{week}_{category}.xlsx"
            if not file_path.exists():
                print(f"  Missing: {file_path}")
                continue
            weekly_values.append(parse_fn(str(file_path)))

        if not weekly_values:
            continue

        buckets = len(weekly_values[0])
        avg = [
            sum(week[i] for week in weekly_values) / len(weekly_values)
            for i in range(buckets)
        ]

        if kind == "weekday":
            for i, label in enumerate(WEEKDAY_LABELS):
                rows.append({"category": category, "weekday": label, "avg_sales_amount": round(avg[i])})
        else:
            for hour in range(buckets):
                rows.append({"category": category, "hour": hour, "avg_sales_amount": round(avg[hour])})

    return pd.DataFrame(rows)


def save_csv(df: pd.DataFrame, output_path: str):
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"Saved: {output_path} ({len(df)} rows)")


if __name__ == "__main__":
    print("=== Weekday Pattern ===")
    df_weekday = parse_pattern("weekday")
    print(df_weekday)
    save_csv(df_weekday, "data/master/weekday_sales.csv")

    print("\n=== Hourly Pattern ===")
    df_hourly = parse_pattern("hourly")
    print(df_hourly)
    save_csv(df_hourly, "data/master/hourly_sales.csv")
