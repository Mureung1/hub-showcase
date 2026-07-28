import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router'
import icuBrandLogo from './assets/icu-brand.png'
import styles from './OnboardingLanding.module.css'

type OnboardingField = {
  label: string
  value: string
}

type OnboardingCard = {
  title: string
  meta: string
  fields: OnboardingField[]
}

const onboardingCards: OnboardingCard[] = [
  {
    title: '오늘 학습 목표를 정합니다',
    meta: 'Step 01',
    fields: [
      { label: 'Input', value: 'React를 처음 배우고 싶어요' },
      { label: 'Output', value: '오늘 학습 큐 생성' },
      { label: 'Next', value: '개념 이해' },
    ],
  },
  {
    title: '개념과 공식 문서를 연결합니다',
    meta: 'Step 02',
    fields: [
      { label: 'Track', value: 'React 입문' },
      { label: 'Focus', value: 'state와 이벤트' },
      { label: 'Source', value: 'React Docs' },
    ],
  },
  {
    title: '코드 실습으로 바로 확인합니다',
    meta: 'Step 03',
    fields: [
      { label: 'Mission', value: 'Counter.jsx 실습' },
      { label: 'Editor', value: 'Starter code' },
      { label: 'Result', value: '테스트 실행' },
    ],
  },
  {
    title: '오답과 복습 일정을 남깁니다',
    meta: 'Step 04',
    fields: [
      { label: 'Review', value: '복습 2개 예정' },
      { label: 'Memory', value: '최근 실수 기록' },
      { label: 'Next', value: '내일 이어서 학습' },
    ],
  },
]

export function OnboardingLanding() {
  const carouselRef = useRef<HTMLDivElement>(null)
  const fullText = '학습을 시작해볼까요?'
  const [typedText, setTypedText] = useState('')

  useEffect(() => {
    let currentText = ''
    let currentIndex = 0

    const intervalId = setInterval(() => {
      if (currentIndex < fullText.length) {
        currentText += fullText[currentIndex]
        setTypedText(currentText)
        currentIndex++
      } else {
        clearInterval(intervalId)
      }
    }, 120)

    return () => clearInterval(intervalId)
  }, [])

  function scrollCarousel(direction: 'previous' | 'next') {
    const carousel = carouselRef.current

    if (!carousel) {
      return
    }

    const firstCard = carousel.querySelector<HTMLElement>('[data-carousel-card]')
    const distance = firstCard ? firstCard.offsetWidth + 18 : 384

    carousel.scrollBy({
      left: direction === 'next' ? distance : -distance,
      behavior: 'smooth',
    })
  }

  return (
    <section className={styles.section} aria-labelledby="onboarding-title">
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <div className={styles.brand} aria-label="ICU I CODE U">
            <span className={styles.brandMark} aria-hidden="true">
              <img src={icuBrandLogo} alt="" />
            </span>
            <span>I CODE U</span>
          </div>

          <div className={styles.controls} aria-label="온보딩 카드 이동">
            <button
              className={styles.arrowButton}
              type="button"
              aria-label="이전 카드 보기"
              onClick={() => scrollCarousel('previous')}
            >
              ‹
            </button>
            <button
              className={styles.arrowButton}
              type="button"
              aria-label="다음 카드 보기"
              onClick={() => scrollCarousel('next')}
            >
              ›
            </button>
          </div>
        </div>

        <div className={styles.hero}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>AI Coding Tutor Desktop</p>
            <h1 className={styles.title} id="onboarding-title">
              {typedText}<span className={styles.cursor} aria-hidden="true">|</span>
            </h1>
            <p className={styles.description}>
              목표를 정하면 ICU가 오늘 학습, 실습, 복습 순서를 이어서 잡아드립니다. 학습을 시작하면
              튜터 설명과 코드 실습 화면으로 자연스럽게 이동합니다.
            </p>
            <Link className={styles.cta} to="/profile">
              학습 프로필 만들기
              <span className={styles.ctaIcon} aria-hidden="true">
                →
              </span>
            </Link>
          </div>

          <div className={styles.preview} aria-label="ICU Today Hub와 Workspace 미리보기">
            <div className={styles.previewHeader}>
              <strong>Today Learning Hub</strong>
              <span>오늘 1개 학습 · 복습 2개 예정</span>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.miniPanel}>
                <span className={styles.miniLabel}>오늘의 추천</span>
                <p className={styles.miniTitle}>
                  React 입문
                  <br />
                  <span className={styles.accent}>Counter.jsx 실습</span>
                </p>
                <div className={styles.progress} aria-hidden="true">
                  <span />
                </div>
              </div>

              <div className={styles.miniPanel}>
                <span className={styles.miniLabel}>Workspace IDE</span>
                <pre className={styles.code}>{`function Counter() {
  const [count, setCount] = useState(0)
  return <button>{count}</button>
}`}</pre>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.carouselWrap}>
          <div className={styles.carousel} ref={carouselRef} aria-label="온보딩 단계 카드">
            {onboardingCards.map((card) => (
              <article className={styles.card} data-carousel-card key={card.title}>
                <div>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>{card.title}</h2>
                    <span className={styles.cardMeta}>{card.meta}</span>
                  </div>
                  <hr className={styles.divider} />
                </div>

                <dl className={styles.fields}>
                  {card.fields.map((field) => (
                    <div className={styles.field} key={field.label}>
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
