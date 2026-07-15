import type { Product } from '../types';
import { ChipIcon } from '../chipIcons';

interface DetailProps {
  product: Product | null;
  onBuy: () => void;
  onRestart: () => void;
}

export function Detail({ product, onBuy, onRestart }: DetailProps) {
  if (!product) return null;

  return (
    <>
      <div className="detail-image" />
      <h1 className="heading" style={{ fontSize: 20 }}>
        {product.name}
      </h1>

      <div className="chip-list">
        <span className="chip-badge">
          <span
            className="chip-icon"
            style={{ background: 'var(--tint-purple)', color: 'var(--color-primary-dark)' }}
          >
            <ChipIcon name="shield" />
          </span>
          <span className="chip-label">HACCP</span>
        </span>
        <span className="chip-badge">
          <span
            className="chip-icon"
            style={{ background: 'var(--tint-blue)', color: 'var(--color-accent-blue)' }}
          >
            <ChipIcon name="certificate" />
          </span>
          <span className="chip-label">시험성적서</span>
        </span>
      </div>

      <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
        {product.price.toLocaleString()}원
      </p>

      <button className="btn" type="button" onClick={onBuy}>
        스마트스토어로 이동
      </button>
      <button className="btn-outline" type="button" onClick={onRestart}>
        처음으로
      </button>
    </>
  );
}
