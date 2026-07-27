import { useEffect, useState } from 'react';
import { getMatchedProducts } from '../api/products';
import type { Product } from '../types';
import { ChipIcon, getChipColor } from '../chipIcons';
import { ApiError } from '../api/ApiError';

interface RecommendProps {
  ingredientIds: number[];
  token: string;
  onSelect: (product: Product) => void;
  onAuthError: () => void;
}

export function Recommend({ ingredientIds, token, onSelect, onAuthError }: RecommendProps) {
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
    getMatchedProducts(ingredientIds, token)
      .then(setProducts)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          onAuthError();
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [ingredientIds, token, onAuthError]);

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
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {product.matchedIngredientNames.map((name) => (
                  <span className="tag" key={name}>
                    {name}
                  </span>
                ))}
                {product.exceedsPersonalLimit && (
                  <span className="tag" style={{ color: 'var(--color-accent-pink)' }}>
                    상한 섭취량 주의
                  </span>
                )}
                {product.pregnancyCaution && (
                  <span className="tag" style={{ color: 'var(--color-accent-pink)' }}>
                    임신·수유 중 주의
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </>
  );
}
