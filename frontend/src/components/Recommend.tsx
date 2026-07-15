import { PRODUCTS } from '../mockData';
import type { Product } from '../types';

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

      {PRODUCTS.map((product) => (
        <button
          className="card product-card"
          type="button"
          key={product.id}
          onClick={() => onSelect(product)}
        >
          <div className="product-thumb" />
          <div>
            <p className="product-name">{product.name}</p>
            <span className="tag">{product.companyTag}</span>
            <p className="product-price">{product.price.toLocaleString()}원</p>
          </div>
        </button>
      ))}
    </>
  );
}
