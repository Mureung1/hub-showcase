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
              <span className="tag">{product.companyTag}</span>
              <p className="product-price">{product.price.toLocaleString()}원</p>
            </div>
          </button>
        );
      })}
    </>
  );
}
