"""
Sales 파일 파서
- 3단 헤더 (조회기간/비교기간/차이) 처리
- MultiIndex 헤더 평탄화
- 조회기간의 수량과 판매액만 추출
"""

import pandas as pd
from pathlib import Path

CATEGORIES = ["김밥", "도시락", "주먹밥", "햄버거샌드위치"]
MONTHS = [f"{i:02d}" for i in range(1, 7)]


def is_summary_row(product_name: str) -> bool:
    """합계/소계/합 행인지 판단"""
    if not product_name:
        return False
    name_lower = str(product_name).lower().strip()
    summary_keywords = ['합계', '소계', '합', 'total', 'subtotal']
    return any(kw in name_lower for kw in summary_keywords)


def parse_sales_file(file_path: str, category: str, month: str) -> pd.DataFrame:
    """
    단일 sales 파일 파싱

    Column positions (by testing):
    - 0: 상품명
    - 4: 조회기간 수량
    - 5: 조회기간 판매액
    """
    try:
        # MultiIndex 헤더로 읽기
        df = pd.read_excel(file_path, sheet_name=0, header=[0, 1])

        data = []

        # 각 행 처리
        for idx, row in df.iterrows():
            # 컬럼 위치로 직접 접근
            product_name = row.iloc[0]  # 첫 번째 컬럼
            sales_qty = row.iloc[4]     # 5번째 컬럼 (조회기간 수량)
            sales_amount = row.iloc[5]  # 6번째 컬럼 (조회기간 판매액)

            # 상품명이 있는 행만 처리 (합계/소계 제외)
            product_name_str = str(product_name).strip() if pd.notna(product_name) else ""
            if product_name_str and not is_summary_row(product_name_str):
                try:
                    qty = int(float(sales_qty) if pd.notna(sales_qty) else 0)
                    # 금액은 쉼표를 제거해야 함 (예: "80,460" → 80460)
                    amount_str = str(sales_amount).replace(',', '') if pd.notna(sales_amount) else "0"
                    amount = int(float(amount_str))

                    data.append({
                        "product_name": product_name_str,
                        "sales_qty": qty,
                        "sales_amount": amount,
                    })
                except (ValueError, TypeError):
                    continue

        if data:
            df_result = pd.DataFrame(data)
            df_result["category"] = category
            df_result["month"] = month
            return df_result[["month", "category", "product_name", "sales_qty", "sales_amount"]]

        return pd.DataFrame()

    except Exception as e:
        print(f"  Error: {str(e)[:50]}")
        return pd.DataFrame()


def parse_all_sales() -> pd.DataFrame:
    """모든 sales 파일 통합 파싱"""
    data_frames = []
    base_path = Path("data/raw/sales")

    for month in MONTHS:
        for category in CATEGORIES:
            file_name = f"sales_{month}_{category}.xlsx"
            file_path = base_path / file_name

            if file_path.exists():
                print(f"Processing: {file_name}")
                df = parse_sales_file(str(file_path), category, month)
                if not df.empty:
                    data_frames.append(df)
                    print(f"  OK: {len(df)} rows")

    if data_frames:
        return pd.concat(data_frames, ignore_index=True)
    return pd.DataFrame()


def save_sales_csv(df: pd.DataFrame, output_path: str = "data/master/sales.csv"):
    """파싱된 데이터를 CSV로 저장"""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"\nSaved: {output_path}")
    print(f"Total rows: {len(df)}")
    print(f"Months: {sorted(df['month'].unique().tolist())}")
    print(f"Categories: {sorted(df['category'].unique().tolist())}")


if __name__ == "__main__":
    print("=== Sales Parser ===\n")
    df_sales = parse_all_sales()

    if not df_sales.empty:
        print("\n=== Sample ===")
        print(df_sales.head(10))
        save_sales_csv(df_sales)
    else:
        print("No data parsed")
