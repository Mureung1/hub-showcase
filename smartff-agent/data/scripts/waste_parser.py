"""
Waste 파일 파서
- 상품코드 dtype 정리 (float → 문자열)
- 폐기 정보 추출 (원가, 폐기수량, 폐기금액)
"""

import json
import pandas as pd
from pathlib import Path

CATEGORIES = ["김밥", "도시락", "주먹밥", "햄버거샌드위치"]
MONTHS = [f"{i:02d}" for i in range(1, 13)]


def is_summary_row(product_name: str) -> bool:
    """합계/소계/합 행인지 판단"""
    if not product_name:
        return False
    name_lower = str(product_name).lower().strip()
    summary_keywords = ['합계', '소계', '합', 'total', 'subtotal']
    return any(kw in name_lower for kw in summary_keywords)


def parse_waste_file(file_path: str, category: str, month: str) -> tuple[pd.DataFrame, dict]:
    """
    단일 waste 파일 파싱

    Column positions:
    - 0: 중분류 (카테고리)
    - 1: 상품코드
    - 2: 상품명
    - 3: 원가
    - 4: 폐기수량
    - 5: 폐기금액

    반환값: (파싱된 DataFrame, {"total_rows": 상품코드+상품명이 있는 행 수, "valid_rows": 정상 인식된 행 수, "skipped_rows": 값 변환 실패로 제외된 행 수})
    """
    stats = {"total_rows": 0, "valid_rows": 0, "skipped_rows": 0}

    try:
        # 1줄 헤더로 읽기
        df = pd.read_excel(file_path, sheet_name=0, header=0)

        data = []

        # 각 행 처리
        for idx, row in df.iterrows():
            product_code = row.iloc[1]    # 상품코드
            product_name = row.iloc[2]    # 상품명
            unit_cost = row.iloc[3]       # 원가
            waste_qty = row.iloc[4]       # 폐기수량
            waste_amount = row.iloc[5]    # 폐기금액

            # 상품코드가 있고 합계가 아닌 행만 처리
            product_name_str = str(product_name).strip() if pd.notna(product_name) else ""
            if pd.notna(product_code) and product_name_str and not is_summary_row(product_name_str):
                stats["total_rows"] += 1
                try:
                    # 상품코드: 정수→문자열 (앞의 0 보존)
                    code_str = str(int(float(product_code)))

                    qty = int(float(waste_qty)) if pd.notna(waste_qty) else 0
                    cost = int(float(unit_cost)) if pd.notna(unit_cost) else 0
                    amount = int(float(waste_amount)) if pd.notna(waste_amount) else 0

                    data.append({
                        "product_code": code_str,
                        "product_name": str(product_name).strip(),
                        "unit_cost": cost,
                        "waste_qty": qty,
                        "waste_amount": amount,
                    })
                    stats["valid_rows"] += 1
                except (ValueError, TypeError):
                    stats["skipped_rows"] += 1
                    continue

        if data:
            df_result = pd.DataFrame(data)
            df_result["category"] = category
            df_result["month"] = month
            return df_result[["month", "category", "product_code", "product_name", "unit_cost", "waste_qty", "waste_amount"]], stats

        return pd.DataFrame(), stats

    except Exception as e:
        print(f"  Error: {str(e)[:50]}")
        return pd.DataFrame(), stats


def parse_all_waste() -> tuple[pd.DataFrame, list[dict]]:
    """모든 waste 파일 통합 파싱. 반환값: (통합 DataFrame, 파일별 파싱 통계 리스트)"""
    data_frames = []
    file_stats = []
    base_path = Path("data/raw/waste")

    for month in MONTHS:
        for category in CATEGORIES:
            file_name = f"waste_{month}_{category}.xlsx"
            file_path = base_path / file_name

            if file_path.exists():
                print(f"Processing: {file_name}")
                df, stats = parse_waste_file(str(file_path), category, month)
                file_stats.append({"filename": file_name, **stats})
                if not df.empty:
                    data_frames.append(df)
                    print(f"  OK: {len(df)} rows")

    if data_frames:
        return pd.concat(data_frames, ignore_index=True), file_stats
    return pd.DataFrame(), file_stats


def save_waste_csv(df: pd.DataFrame, output_path: str = "data/master/waste.csv"):
    """파싱된 데이터를 CSV로 저장"""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"\nSaved: {output_path}")
    print(f"Total rows: {len(df)}")
    print(f"Months: {sorted(df['month'].unique().tolist())}")
    print(f"Categories: {sorted(df['category'].unique().tolist())}")


if __name__ == "__main__":
    print("=== Waste Parser ===\n")
    df_waste, file_stats = parse_all_waste()

    if not df_waste.empty:
        print("\n=== Sample ===")
        print(df_waste.head(10))
        save_waste_csv(df_waste)
    else:
        print("No data parsed")

    # Node(etlService.ts)가 stdout에서 이 줄만 골라 파일별 파싱 통계를 읽는다
    print("STATS_JSON:" + json.dumps(file_stats, ensure_ascii=False))
