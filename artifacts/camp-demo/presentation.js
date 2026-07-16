const slides = [...document.querySelectorAll('[data-slide]')]
const mainSlides = slides.filter((slide) => slide.dataset.deckSection === 'main')
const appendixSlides = slides.filter((slide) => slide.dataset.deckSection === 'appendix')
const slidesById = new Map(slides.map((slide) => [slide.dataset.slideId, slide]))
const previousButton = document.querySelector('#previousSlide')
const nextButton = document.querySelector('#nextSlide')
const fullscreenButton = document.querySelector('#fullscreenButton')
const returnToMainButton = document.querySelector('#returnToMainButton')
const counter = document.querySelector('#slideCounter')
const dots = document.querySelector('#slideDots')

let currentSlide = mainSlides[0]
let currentSection = null

const getSection = (slide) => slide.dataset.deckSection === 'appendix' ? 'appendix' : 'main'
const getSequence = (section) => section === 'appendix' ? appendixSlides : mainSlides

const readSlideFromHash = () => {
  const hash = window.location.hash.slice(1)
  const stableSlide = slidesById.get(hash)
  if (stableSlide) return stableSlide

  const legacyMatch = hash.match(/^slide-(\d+)$/)
  if (!legacyMatch) return mainSlides[0]

  const legacyIndex = Math.min(Math.max(Number(legacyMatch[1]) - 1, 0), mainSlides.length - 1)
  return mainSlides[legacyIndex]
}

const buildDots = (section) => {
  dots.replaceChildren()

  getSequence(section).forEach((slide, index) => {
    const dot = document.createElement('button')
    dot.type = 'button'
    dot.setAttribute('aria-label', section === 'appendix' ? `부록 ${index + 1}` : `${index + 1}번 슬라이드`)
    dot.addEventListener('click', () => showSlide(slide))
    dots.append(dot)
  })
}

const showSlide = (slide, updateHash = true) => {
  if (!slide) return

  const section = getSection(slide)
  const sequence = getSequence(section)
  const currentIndex = sequence.indexOf(slide)

  if (currentSection !== section) {
    currentSection = section
    buildDots(section)
  }

  currentSlide = slide

  slides.forEach((candidate) => {
    const isActive = candidate === currentSlide
    candidate.hidden = !isActive
    candidate.classList.toggle('is-active', isActive)
  })

  ;[...dots.children].forEach((dot, dotIndex) => {
    const isActive = dotIndex === currentIndex
    dot.classList.toggle('is-active', isActive)
    dot.setAttribute('aria-current', isActive ? 'page' : 'false')
  })

  counter.textContent = section === 'appendix'
    ? `부록 ${currentIndex + 1} / ${sequence.length}`
    : `${currentIndex + 1} / ${sequence.length}`
  previousButton.disabled = currentIndex === 0
  nextButton.disabled = currentIndex === sequence.length - 1
  returnToMainButton.hidden = section !== 'appendix'

  if (updateHash) {
    history.replaceState(null, '', `#${slide.dataset.slideId}`)
  }
}

const showRelativeSlide = (offset) => {
  const sequence = getSequence(currentSection)
  const nextIndex = sequence.indexOf(currentSlide) + offset
  if (nextIndex < 0 || nextIndex >= sequence.length) return
  showSlide(sequence[nextIndex])
}

previousButton.addEventListener('click', () => showRelativeSlide(-1))
nextButton.addEventListener('click', () => showRelativeSlide(1))
returnToMainButton.addEventListener('click', () => showSlide(slidesById.get('closing')))

fullscreenButton.addEventListener('click', async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen()
  } else {
    await document.documentElement.requestFullscreen()
  }
})

window.addEventListener('hashchange', () => showSlide(readSlideFromHash()))

window.addEventListener('keydown', (event) => {
  const target = event.target
  if (target instanceof HTMLElement && target.matches('input, textarea, [contenteditable="true"]')) return

  if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
    event.preventDefault()
    showRelativeSlide(-1)
  }

  if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'PageDown') {
    event.preventDefault()
    showRelativeSlide(1)
  }
})

showSlide(readSlideFromHash())
