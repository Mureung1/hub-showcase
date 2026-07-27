import type { Product } from '../types';
import { ChipIcon } from '../chipIcons';

interface DetailProps {
  product: Product | null;
  onBuy: () => void;
  onRestart: () => void;
}

export function Detail({ product, onBuy, onRestart }: DetailProps) {
  if (!product) {
    return (
      <>
        <h1 className="heading" style={{ fontSize: 20 }}>
          선택한 제품을 찾을 수 없어요
        </h1>
        <p className="sub">처음부터 다시 진행해주세요.</p>
        <button className="btn" type="button" onClick={onRestart}>
          처음으로
        </button>
      </>
    );
  }

  return (
    <>
      <div className="detail-image" />
      <div>
        <h1 className="heading" style={{ fontSize: 20 }}>
          {product.name}
        </h1>
        <p className="sub">{product.companyName}</p>
      </div>

      <div className="chip-list">
        {product.haccpCertified && (
          <span className="chip-badge">
            <span
              className="chip-icon"
              style={{ background: 'var(--tint-purple)', color: 'var(--color-primary-dark)' }}
            >
              <ChipIcon name="shield" />
            </span>
            <span className="chip-label">HACCP</span>
          </span>
        )}
        {product.testReportUrl && (
          <span className="chip-badge">
            <span
              className="chip-icon"
              style={{ background: 'var(--tint-blue)', color: 'var(--color-accent-blue)' }}
            >
              <ChipIcon name="certificate" />
            </span>
            <span className="chip-label">시험성적서</span>
          </span>
        )}
      </div>

      <div className="card stat-row">
        <div>
          <p className="stat-label">가격</p>
          <p className="stat-value">{(product.price ?? 0).toLocaleString()}원</p>
        </div>
        <div>
          <p className="stat-label">일치 성분</p>
          <p className="stat-value">{product.matchCount}개</p>
        </div>
      </div>

      <button className="btn" type="button" onClick={onBuy} disabled={!product.smartstoreUrl}>
        판매처로 이동
      </button>
      <button className="btn-outline" type="button" onClick={onRestart}>
        처음으로
      </button>
    </>
  );
}
