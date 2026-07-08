import './PlaceholderCard.css'

/**
 * 아직 내용이 채워지지 않은 화면을 위한 셸(placeholder) 카드.
 * 페이지 제목과 짧은 설명, "구현 예정" 배지를 보여준다.
 */
function PlaceholderCard({ title, description }) {
  return (
    <section className="placeholder-card">
      <h1>{title}</h1>
      {description && <p className="placeholder-card__desc">{description}</p>}
      <span className="placeholder-card__badge">구현 예정</span>
    </section>
  )
}

export default PlaceholderCard
