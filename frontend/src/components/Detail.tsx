import type { Product } from '../types';

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

      <div style={{ display: 'flex', gap: 8 }}>
        <span className="tag-g">HACCP</span>
        <span className="tag-g">시험성적서</span>
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
