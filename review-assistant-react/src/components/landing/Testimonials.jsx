import { useInView } from '../../hooks/useInView.js'

const TESTIMONIALS = [
  { name: '카페 사장님 A (예시)', text: '반복되는 대기시간 불만을 놓치지 않게 돼서 좋아요.' },
  { name: '식당 사장님 B (예시)', text: '답변 톤을 고민할 필요가 없어서 시간이 많이 절약돼요.' },
  { name: '미용실 원장님 C (예시)', text: '리뷰마다 점수가 있어서 뭐부터 답장할지 헷갈리지 않아요.' },
]

function Testimonials() {
  const [testimonialsRef, testimonialsInView] = useInView()

  return (
    <section
      ref={testimonialsRef}
      className={`testimonials scroll-reveal ${testimonialsInView ? 'in-view' : ''}`}
    >
      <h2 className="section-title">이런 반응을 목표로 해요</h2>
      <p className="section-sub">※ 아직 실제 사용자 후기는 없어요 — 목표로 하는 반응을 가상으로 구성한 예시예요</p>
      <div className="testimonial-grid">
        {TESTIMONIALS.map((testimonial) => (
          <div className="testimonial-card" key={testimonial.name}>
            <p className="testimonial-text">&quot;{testimonial.text}&quot;</p>
            <div className="testimonial-name">{testimonial.name}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Testimonials
