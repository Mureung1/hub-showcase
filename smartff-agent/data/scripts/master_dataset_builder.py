"""
Master Dataset Builder
- sales.csv와 waste.csv를 읽어 category+month로 집계
- 재무 지표 계산 적용
- merged_dataset.csv 생성
"""

import pandas as pd
import numpy as np
from pathlib import Path


def build_master_dataset():
    """Master Dataset 생성"""

    # 1. CSV 파일 로드
    sales_csv = Path("data/master/sales.csv")
    waste_csv = Path("data/master/waste.csv")

    if not sales_csv.exists():
        raise FileNotFoundError(f"{sales_csv}를 찾을 수 없습니다. 먼저 data/scripts/sales_parser.py를 실행하세요.")
    if not waste_csv.exists():
        raise FileNotFoundError(f"{waste_csv}를 찾을 수 없습니다. 먼저 data/scripts/waste_parser.py를 실행하세요.")

    print("Loading CSV files...")
    df_sales = pd.read_csv(sales_csv)
    df_waste = pd.read_csv(waste_csv)

    # 2. SALES 집계 (category + month)
    print("Aggregating sales data...")
    sales_agg = df_sales.groupby(['month', 'category']).agg({
        'sales_qty': 'sum',
        'sales_amount': 'sum',
    }).reset_index()

    # 평균판매가 계산
    sales_agg['avg_selling_price'] = (
        sales_agg['sales_amount'] / sales_agg['sales_qty']
    ).astype(int)

    # 3. WASTE 집계 (category + month)
    print("Aggregating waste data...")
    waste_agg = df_waste.groupby(['month', 'category']).agg({
        'waste_qty': 'sum',
        'waste_amount': 'sum',
        'unit_cost': 'mean',  # 폐기 이력 상품들의 원가 평균
    }).reset_index()

    waste_agg.rename(columns={'unit_cost': 'avg_unit_cost'}, inplace=True)
    waste_agg['avg_unit_cost'] = waste_agg['avg_unit_cost'].astype(int)

    # 4. Merge (outer join — 방어적 처리)
    print("Merging sales and waste data...")
    merged = pd.merge(
        sales_agg,
        waste_agg,
        on=['month', 'category'],
        how='outer'
    )

    # 결측치 처리 (발생하면 안 되지만 방어적으로)
    merged['waste_qty'] = merged['waste_qty'].fillna(0).astype(int)
    merged['waste_amount'] = merged['waste_amount'].fillna(0).astype(int)
    merged['avg_unit_cost'] = merged['avg_unit_cost'].fillna(0).astype(int)

    # 5. 재무 계산 (financial_calculation_spec.md 기반)
    print("Calculating financial metrics...")

    # 평균원가율
    merged['avg_cost_rate'] = (
        merged['avg_unit_cost'] / merged['avg_selling_price']
    ).round(3)

    # 추정 매출원가
    estimated_cogs = (merged['sales_amount'] * merged['avg_cost_rate']).astype(int)

    # 마진액
    merged['margin_amount'] = (merged['sales_amount'] - estimated_cogs).astype(int)

    # 마진율
    merged['margin_rate'] = (
        (merged['margin_amount'] / merged['sales_amount'] * 100)
    ).round(1)

    # 폐기율
    merged['waste_rate'] = (
        (merged['waste_amount'] / merged['sales_amount'] * 100)
    ).round(1)

    # 순이익
    merged['net_income'] = (merged['margin_amount'] - merged['waste_amount']).astype(int)

    # 순이익율
    merged['net_rate'] = (
        (merged['net_income'] / merged['sales_amount'] * 100)
    ).round(1)

    # 6. 컬럼 순서 정렬 (MASTER_DATASET_SPEC.md 기준)
    merged = merged[[
        'month', 'category',
        'sales_qty', 'sales_amount', 'avg_selling_price',
        'waste_qty', 'waste_amount', 'avg_unit_cost',
        'avg_cost_rate',
        'margin_amount', 'margin_rate',
        'waste_rate',
        'net_income', 'net_rate'
    ]]

    # 7. 정렬
    merged = merged.sort_values(['month', 'category']).reset_index(drop=True)

    return merged


def validate_dataset(df: pd.DataFrame):
    """데이터셋 검증"""
    print("\n=== Validation ===")

    # 총 row 수 — 카테고리 x 월이 빠짐없이 채워진 "완전한 격자"인지 동적으로 검증
    # (특정 개월 수를 하드코딩하지 않음 — 업로드가 누적되면서 월 수가 늘어날 수 있음)
    total_rows = len(df)
    categories = sorted(df['category'].unique())
    months = sorted([int(m) for m in df['month'].unique()])
    expected_rows = len(categories) * len(months)
    print(f"Total rows: {total_rows} (expected: {expected_rows} = {len(categories)} categories x {len(months)} months)")
    assert total_rows == expected_rows, f"Row count mismatch: {total_rows} != {expected_rows} (카테고리x월 격자에 빠진 조합이 있는지 확인)"

    # 카테고리별 분포 — 모든 카테고리가 동일하게 전체 월수만큼 있어야 함
    print(f"\nCategory distribution:")
    for category in categories:
        count = len(df[df['category'] == category])
        print(f"  {category}: {count} rows")
        assert count == len(months), f"Category {category} has {count} rows, expected {len(months)}"

    # 월별 분포 — 모든 월이 동일하게 전체 카테고리 수만큼 있어야 함
    print(f"\nMonth distribution:")
    for month in months:
        count = len(df[df['month'] == month])
        print(f"  {month}월: {count} rows")
        assert count == len(categories), f"Month {month} has {count} rows, expected {len(categories)}"

    # 결측치
    print(f"\nMissing values:")
    missing = df.isnull().sum()
    assert missing.sum() == 0, f"Missing values found: {missing[missing > 0].to_dict()}"
    print(f"  None (all {len(df.columns)} columns complete)")

    # 원가율 범위
    print(f"\nCost rate range:")
    min_rate = df['avg_cost_rate'].min()
    max_rate = df['avg_cost_rate'].max()
    print(f"  Min: {min_rate:.1%}, Max: {max_rate:.1%}")
    print(f"  Expected: 40% ~ 80% (abnormal values indicate data quality issues)")

    # 이상치 확인
    abnormal = df[(df['avg_cost_rate'] < 0.4) | (df['avg_cost_rate'] > 0.8)]
    if len(abnormal) > 0:
        print(f"\n[WARNING] Abnormal cost rates:")
        for _, row in abnormal.iterrows():
            print(f"  {row['month']} {row['category']}: {row['avg_cost_rate']:.1%}")

    # 모든 수치 검증
    print(f"\nNumeric validation:")
    assert (df['sales_qty'] > 0).all(), "Found non-positive sales_qty"
    assert (df['sales_amount'] > 0).all(), "Found non-positive sales_amount"
    assert (df['avg_selling_price'] > 0).all(), "Found non-positive avg_selling_price"
    assert (df['waste_qty'] >= 0).all(), "Found negative waste_qty"
    assert (df['avg_cost_rate'] > 0).all(), "Found non-positive avg_cost_rate"
    print("  All numeric values valid")


def save_master_dataset(df: pd.DataFrame, output_path: str = "data/master/merged_dataset.csv"):
    """Master Dataset 저장"""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"\n[OK] Saved: {output_path}")


if __name__ == "__main__":
    print("=== Master Dataset Builder ===\n")

    try:
        # 생성
        df_master = build_master_dataset()

        # 검증
        validate_dataset(df_master)

        # 저장
        save_master_dataset(df_master)

        # 샘플
        print(f"\n=== Sample (first 5 rows) ===")
        print(df_master.head().to_string())

        print(f"\n[SUCCESS] Master Dataset 생성 완료!")

    except Exception as e:
        print(f"\n[ERROR] {e}")
        raise
