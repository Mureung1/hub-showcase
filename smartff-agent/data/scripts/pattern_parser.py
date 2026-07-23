"""
Weekday / Hourly Sales 패턴 파서
- 원본은 상품 단위가 아닌, 카테고리 x 주차 단위로 이미 집계된 매트릭스
- 각 시트 2행("조회기간")만 유효 데이터. 3행("비교기간")은 2행과 동일값,
  4행("차이")은 항상 0이라 사용하지 않음
- 월~일을 한 주차로 보되, 달마다 실제로 몇 주차까지 있는지는 다를 수 있어
  (예: 7월은 6/29~7/5가 1주차라 5주차까지 생길 수 있음) 고정하지 않고
  data/raw/{kind}_sales에 실제로 존재하는 월·주차 파일만 스캔해서 평균 낸다.
"""

import re
import pandas as pd
from pathlib import Path

CATEGORIES = ["김밥", "도시락", "주먹밥", "햄버거샌드위치"]
MAX_WEEKS_PER_MONTH = 5  # 월~일 기준 분할 시 한 달이 가질 수 있는 최대 주차 수
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


def discover_months(kind: str) -> list[str]:
    """data/raw/{kind}_sales에 실제로 파일이 존재하는 월(MM) 목록을 파일명에서 추출"""
    base_path = Path(f"data/raw/{kind}_sales")
    pattern = re.compile(rf"{kind}_sales_(\d{{2}})_w\d+_.+\.xlsx")

    months = set()
    if base_path.exists():
        for f in base_path.iterdir():
            m = pattern.match(f.name)
            if m:
                months.add(m.group(1))

    return sorted(months)


def parse_pattern(kind: str) -> pd.DataFrame:
    """kind: 'weekday' | 'hourly' — 월x카테고리별로, 실제 존재하는 주차만 평균"""
    base_path = Path(f"data/raw/{kind}_sales")
    parse_fn = parse_weekday_file if kind == "weekday" else parse_hourly_file

    rows = []
    for month in discover_months(kind):
        for category in CATEGORIES:
            weekly_values = []
            for week_num in range(1, MAX_WEEKS_PER_MONTH + 1):
                file_path = base_path / f"{kind}_sales_{month}_w{week_num}_{category}.xlsx"
                if not file_path.exists():
                    continue
                weekly_values.append(parse_fn(str(file_path)))

            if not weekly_values:
                print(f"  Missing: {month}월 {category} (주차 파일 없음)")
                continue

            print(f"  {month}월 {category}: {len(weekly_values)}주치 평균")
            buckets = len(weekly_values[0])
            avg = [
                sum(week[i] for week in weekly_values) / len(weekly_values)
                for i in range(buckets)
            ]

            if kind == "weekday":
                for i, label in enumerate(WEEKDAY_LABELS):
                    rows.append({"month": month, "category": category, "weekday": label, "avg_sales_amount": round(avg[i])})
            else:
                for hour in range(buckets):
                    rows.append({"month": month, "category": category, "hour": hour, "avg_sales_amount": round(avg[hour])})

    df = pd.DataFrame(rows)
    if not df.empty:
        df = df.sort_values(["month", "category"]).reset_index(drop=True)
    return df


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
