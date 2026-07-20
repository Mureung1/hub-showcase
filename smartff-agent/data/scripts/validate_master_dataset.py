"""
Master Dataset 검증 스크립트
- 데이터 완성도 확인
- 계산 로직 검증
- 이상치 탐지
"""

import pandas as pd
import numpy as np
from pathlib import Path


def load_dataset(csv_path: str = "data/master/merged_dataset.csv") -> pd.DataFrame:
    """Master Dataset 로드"""
    if not Path(csv_path).exists():
        raise FileNotFoundError(f"{csv_path}를 찾을 수 없습니다")
    return pd.read_csv(csv_path)


def validate_structure(df: pd.DataFrame):
    """구조 검증"""
    print("=== 1. 구조 검증 ===\n")

    expected_cols = [
        'month', 'category',
        'sales_qty', 'sales_amount', 'avg_selling_price',
        'waste_qty', 'waste_amount', 'avg_unit_cost',
        'avg_cost_rate',
        'margin_amount', 'margin_rate',
        'waste_rate',
        'net_income', 'net_rate'
    ]

    print(f"컬럼 수: {len(df.columns)} (예상: {len(expected_cols)})")
    if list(df.columns) == expected_cols:
        print("[OK] 컬럼명 정확함")
    else:
        print("[ERROR] 컬럼명 불일치")
        print(f"  예상: {expected_cols}")
        print(f"  실제: {list(df.columns)}")

    print(f"\n행 수: {len(df)} (예상: 24)")
    if len(df) == 24:
        print("[OK] 행 수 정확함")
    else:
        print("[ERROR] 행 수 불일치")

    print(f"\n데이터 타입:")
    print(df.dtypes)


def validate_completeness(df: pd.DataFrame):
    """완성도 검증 (결측치)"""
    print("\n=== 2. 완성도 검증 (결측치) ===\n")

    missing = df.isnull().sum()
    if missing.sum() == 0:
        print("[OK] 결측치 없음 (모든 셀 완전)")
    else:
        print("[ERROR] 결측치 발견:")
        print(missing[missing > 0])

    # 0 값 확인
    print("\n0 값 확인:")
    for col in ['sales_qty', 'sales_amount', 'waste_qty']:
        zeros = (df[col] == 0).sum()
        if zeros > 0:
            print(f"  {col}: {zeros}개 행")


def validate_distribution(df: pd.DataFrame):
    """분포 검증 (카테고리/월)"""
    print("\n=== 3. 분포 검증 ===\n")

    print("카테고리별 분포:")
    for cat in sorted(df['category'].unique()):
        count = len(df[df['category'] == cat])
        print(f"  {cat}: {count}행 (예상: 6)")

    print("\n월별 분포:")
    for month in sorted(df['month'].unique()):
        count = len(df[df['month'] == month])
        print(f"  {month}월: {count}행 (예상: 4)")


def validate_calculations(df: pd.DataFrame):
    """계산 로직 검증"""
    print("\n=== 4. 계산 로직 검증 ===\n")

    tolerance = 1  # 반올림 오차 허용
    errors = []

    for idx, row in df.iterrows():
        # avg_selling_price 검증
        expected_avg_price = row['sales_amount'] / row['sales_qty']
        if abs(row['avg_selling_price'] - expected_avg_price) > tolerance:
            errors.append(f"Row {idx}: avg_selling_price 계산 오류")

        # margin_amount 검증
        estimated_cogs = row['sales_amount'] * row['avg_cost_rate']
        expected_margin = row['sales_amount'] - estimated_cogs
        if abs(row['margin_amount'] - expected_margin) > tolerance:
            errors.append(f"Row {idx}: margin_amount 계산 오류")

        # margin_rate 검증
        expected_margin_rate = (row['margin_amount'] / row['sales_amount'] * 100)
        if abs(row['margin_rate'] - expected_margin_rate) > 0.1:
            errors.append(f"Row {idx}: margin_rate 계산 오류")

        # waste_rate 검증
        expected_waste_rate = (row['waste_amount'] / row['sales_amount'] * 100)
        if abs(row['waste_rate'] - expected_waste_rate) > 0.1:
            errors.append(f"Row {idx}: waste_rate 계산 오류")

        # net_income 검증
        expected_net_income = row['margin_amount'] - row['waste_amount']
        if abs(row['net_income'] - expected_net_income) > tolerance:
            errors.append(f"Row {idx}: net_income 계산 오류")

        # net_rate 검증
        expected_net_rate = (row['net_income'] / row['sales_amount'] * 100)
        if abs(row['net_rate'] - expected_net_rate) > 0.1:
            errors.append(f"Row {idx}: net_rate 계산 오류")

    if errors:
        print("[ERROR] 계산 오류 발견:")
        for err in errors[:10]:  # 최대 10개까지만 출력
            print(f"  {err}")
    else:
        print("[OK] 모든 계산 로직 정확함")


def validate_ranges(df: pd.DataFrame):
    """범위 검증 (비정상치 탐지)"""
    print("\n=== 5. 범위 검증 ===\n")

    print("원가율 (avg_cost_rate):")
    print(f"  최소: {df['avg_cost_rate'].min():.1%}")
    print(f"  최대: {df['avg_cost_rate'].max():.1%}")
    print(f"  평균: {df['avg_cost_rate'].mean():.1%}")
    if df['avg_cost_rate'].min() < 0.4 or df['avg_cost_rate'].max() > 0.8:
        print("  [WARNING] 비정상 범위 (40~80% 권장)")
    else:
        print("  [OK] 정상 범위")

    print("\n마진율 (margin_rate):")
    print(f"  최소: {df['margin_rate'].min():.1f}%")
    print(f"  최대: {df['margin_rate'].max():.1f}%")
    print(f"  평균: {df['margin_rate'].mean():.1f}%")
    print(f"  권장: 25% ~ 40%")

    print("\n폐기율 (waste_rate):")
    print(f"  최소: {df['waste_rate'].min():.1f}%")
    print(f"  최대: {df['waste_rate'].max():.1f}%")
    print(f"  평균: {df['waste_rate'].mean():.1f}%")
    print(f"  권장: < 15%")
    if df['waste_rate'].max() > 15:
        print("  [WARNING] 6월 폐기율 높음 (가능한 데이터 품질 이슈)")

    print("\n순이익율 (net_rate):")
    print(f"  최소: {df['net_rate'].min():.1f}%")
    print(f"  최대: {df['net_rate'].max():.1f}%")
    print(f"  평균: {df['net_rate'].mean():.1f}%")


def compare_with_expected():
    """이전 수동 검증과 비교"""
    print("\n=== 6. 이전 수동 검증과 비교 ===\n")

    df = load_dataset()

    # 1월 김밥 데이터 확인
    jan_kimbap = df[(df['month'] == 1) & (df['category'] == '김밥')]
    if not jan_kimbap.empty:
        row = jan_kimbap.iloc[0]
        print("1월 김밥 검증:")
        print(f"  판매액: {row['sales_amount']:,}원")
        print(f"  마진액: {row['margin_amount']:,}원")
        print(f"  폐기손실: {row['waste_amount']:,}원")
        print(f"  순이익: {row['net_income']:,}원")
        print(f"\n  마진율: {row['margin_rate']:.1f}%")
        print(f"  폐기율: {row['waste_rate']:.1f}%")
        print(f"  순이익율: {row['net_rate']:.1f}%")


def summary_statistics(df: pd.DataFrame):
    """요약 통계"""
    print("\n=== 7. 요약 통계 ===\n")

    print("월별 총매출액:")
    for month in sorted(df['month'].unique()):
        total_sales = df[df['month'] == month]['sales_amount'].sum()
        print(f"  {month}월: {total_sales:,}원")

    print(f"\n전체 판매액: {df['sales_amount'].sum():,}원")
    print(f"전체 폐기손실: {df['waste_amount'].sum():,}원")
    print(f"전체 순이익 (추정): {df['net_income'].sum():,}원")

    print(f"\n카테고리별 평균 순이익율:")
    for cat in sorted(df['category'].unique()):
        avg_net_rate = df[df['category'] == cat]['net_rate'].mean()
        print(f"  {cat}: {avg_net_rate:.1f}%")


if __name__ == "__main__":
    print("=" * 60)
    print("Master Dataset 검증")
    print("=" * 60 + "\n")

    try:
        df = load_dataset()

        validate_structure(df)
        validate_completeness(df)
        validate_distribution(df)
        validate_calculations(df)
        validate_ranges(df)
        compare_with_expected()
        summary_statistics(df)

        print("\n" + "=" * 60)
        print("검증 완료")
        print("=" * 60)

    except Exception as e:
        print(f"\n검증 중 오류: {e}")
        raise
