import { useEffect, useState } from 'react';
import { getMatchedProducts } from '../api/products';
import type { Product } from '../types';
import { ChipIcon, getChipColor } from '../chipIcons';

interface RecommendProps {
  ingredientIds: number[];
  onSelect: (product: Product) => void;
}

export function Recommend({ ingredientIds, onSelect }: RecommendProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ingredientIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getMatchedProducts(ingredientIds)
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ingredientIds]);

  return (
    <>
      <h1 className="heading" style={{ fontSize: 22 }}>
        믿을 수 있는
        <br />
        제품
      </h1>
      <p className="sub" style={{ marginTop: -8 }}>
        기업 규모와 상관없이 성분과 품질 기준으로만 골랐어요.
      </p>
      <span className="tag-g" style={{ alignSelf: 'flex-start' }}>
        성분 기준 추천
      </span>

      {loading && <p className="sub">제품을 찾는 중이에요...</p>}
      {error && <p className="sub" style={{ color: 'var(--color-accent-pink)' }}>{error}</p>}
      {!loading && !error && products.length === 0 && (
        <p className="sub">추천 성분과 일치하는 제품이 없어요.</p>
      )}

      {products.map((product, index) => {
        const color = getChipColor(index);
        return (
          <button
            className="card product-card"
            type="button"
            key={product.id}
            onClick={() => onSelect(product)}
            style={{ alignItems: 'flex-start' }}
          >
            <div
              className="product-thumb"
              style={{
                background: color.tint,
                color: color.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChipIcon name="leaf" />
            </div>
            <div>
              <p className="product-name">{product.name}</p>
              <span className="tag">{product.companyName}</span>
              <p className="product-price">{(product.price ?? 0).toLocaleString()}원</p>
              <p className="sub" style={{ marginTop: 4 }}>
                일치 성분 {product.matchCount}개
              </p>
            </div>
          </button>
        );
      })}
    </>
  );
}
