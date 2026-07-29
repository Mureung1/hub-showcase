// prototype/home.html의 프로모 배너를 그대로 포팅 — 라디오 hack으로 슬라이드 전환(JS 불필요), CSS는 src/index.css 참고.
// image는 유튜브 고화질(maxresdefault) 썸네일 — 고화질이 없는 영상이면 아래 img의 onError가 저화질(hqdefault)로 자동 대체한다.
const SLIDES = [
  {
    id: 'promo-1',
    eyebrow: '이번 주 최저가 특가',
    headline: (
      <>
        제철 재료로
        <br />
        가성비 요리 찾기
      </>
    ),
    image: 'https://img.youtube.com/vi/4quUR3RLVyI/maxresdefault.jpg',
  },
  {
    id: 'promo-2',
    eyebrow: '이번 주 가성비 픽',
    headline: (
      <>
        가성비 TOP3
        <br />
        레시피 모아보기
      </>
    ),
    image: 'https://img.youtube.com/vi/RUgH6TBDtsM/maxresdefault.jpg',
  },
  {
    id: 'promo-3',
    eyebrow: '바쁜 날엔 이거',
    headline: (
      <>
        10분 안에
        <br />
        완성하는 한 끼
      </>
    ),
    image: 'https://img.youtube.com/vi/Wk4gfmVRE_I/maxresdefault.jpg',
  },
]

function PromoBanner() {
  return (
    <div className="promo-banner">
      {SLIDES.map((slide, index) => (
        <input
          key={slide.id}
          type="radio"
          name="promo"
          id={slide.id}
          className="promo-radio"
          defaultChecked={index === 0}
        />
      ))}

      {SLIDES.map((slide, index) => (
        <div key={slide.id} className="promo-slide" data-slide={index + 1}>
          <div className="promo-text">
            <p className="promo-eyebrow">{slide.eyebrow}</p>
            <h2>{slide.headline}</h2>
          </div>
          <img
            className="promo-image"
            src={slide.image}
            alt=""
            onLoad={(event) => {
              // 유튜브는 고화질(maxresdefault)이 없는 영상도 120x90 회색 플레이스홀더를 "정상 응답"으로 주기 때문에
              // onError가 안 걸린다 — 로드된 실제 크기로 플레이스홀더인지 판별해서 저화질(hqdefault)로 바꿔치기한다.
              const fallback = slide.image.replace('maxresdefault.jpg', 'hqdefault.jpg')
              if (event.currentTarget.naturalWidth <= 120 && event.currentTarget.src !== fallback) {
                event.currentTarget.src = fallback
              }
            }}
            onError={(event) => {
              const fallback = slide.image.replace('maxresdefault.jpg', 'hqdefault.jpg')
              if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback
            }}
          />
        </div>
      ))}

      <div className="promo-dots">
        {SLIDES.map((slide) => (
          <label key={slide.id} htmlFor={slide.id} className="promo-dot" />
        ))}
      </div>
    </div>
  )
}

export default PromoBanner
