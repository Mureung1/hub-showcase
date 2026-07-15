import { PRODUCTS } from '../mockData';
import type { Product } from '../types';
import { ChipIcon, getChipColor } from '../chipIcons';

interface RecommendProps {
  onSelect: (product: Product) => void;
}

export function Recommend({ onSelect }: RecommendProps) {
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

      {PRODUCTS.map((product, index) => {
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
              <p className="product-price">{product.price.toLocaleString()}원</p>
              <p className="sub" style={{ marginTop: 4 }}>
                {product.ingredients} · 리뷰 {product.reviews}개
              </p>
            </div>
          </button>
        );
      })}
    </>
  );
}
