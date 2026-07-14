function ProductCard({ product, onAddCart, onJoin, isJoined, badge = "진행 중" }) {
  const progress = Math.min((product.currentPeople / product.targetPeople) * 100, 100);
  const discount = Math.round((1 - product.price / product.originalPrice) * 100);

  return (
    <article className="product-card">
      <div className="product-image">
        <span className="product-badge">{badge}</span>
        <button className="quick-add" type="button" onClick={() => onAddCart(product)} aria-label={`${product.name} 카트 담기`}>
          +
        </button>
        <span aria-hidden="true">{product.emoji}</span>
      </div>

      <h3>{product.name}</h3>
      <p className="product-meta">{product.pickupLocation} · {product.currentPeople}명 참여 중</p>

      <div className="price-row">
        <strong>{product.price.toLocaleString()}원</strong>
        <del>{product.originalPrice.toLocaleString()}원</del>
        <span>-{discount}%</span>
      </div>

      <div className="progress-track" aria-label={`모집 진행률 ${Math.round(progress)}퍼센트`}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="progress-info">
        <span><strong>{product.currentPeople}/{product.targetPeople}명</strong> 참여</span>
        <span>{product.deadline}</span>
      </div>

      <div className="ai-reason">✨ {product.recommendationReason}</div>

      <div className="card-actions">
        <button className="button button-soft" type="button" onClick={() => onAddCart(product)}>
          카트 담기
        </button>
        <button className="button button-primary" type="button" onClick={() => onJoin(product)} disabled={isJoined}>
          {isJoined ? "참여 완료" : "공동구매 참여"}
        </button>
      </div>
    </article>
  );
}

export default ProductCard;
