const slides = [...document.querySelectorAll('[data-slide]')]
const previousButton = document.querySelector('#previousSlide')
const nextButton = document.querySelector('#nextSlide')
const fullscreenButton = document.querySelector('#fullscreenButton')
const counter = document.querySelector('#slideCounter')
const dots = document.querySelector('#slideDots')

let currentIndex = 0

const readIndexFromHash = () => {
  const match = window.location.hash.match(/^#slide-(\d+)$/)
  if (!match) return 0
  return Math.min(Math.max(Number(match[1]) - 1, 0), slides.length - 1)
}

const showSlide = (index, updateHash = true) => {
  currentIndex = Math.min(Math.max(index, 0), slides.length - 1)

  slides.forEach((slide, slideIndex) => {
    const isActive = slideIndex === currentIndex
    slide.hidden = !isActive
    slide.classList.toggle('is-active', isActive)
  })

  ;[...dots.children].forEach((dot, dotIndex) => {
    dot.classList.toggle('is-active', dotIndex === currentIndex)
    dot.setAttribute('aria-current', dotIndex === currentIndex ? 'page' : 'false')
  })

  counter.textContent = `${currentIndex + 1} / ${slides.length}`
  previousButton.disabled = currentIndex === 0
  nextButton.disabled = currentIndex === slides.length - 1

  if (updateHash) {
    history.replaceState(null, '', `#slide-${currentIndex + 1}`)
  }
}

slides.forEach((_, index) => {
  const dot = document.createElement('button')
  dot.type = 'button'
  dot.setAttribute('aria-label', `${index + 1}번 슬라이드`)
  dot.addEventListener('click', () => showSlide(index))
  dots.append(dot)
})

previousButton.addEventListener('click', () => showSlide(currentIndex - 1))
nextButton.addEventListener('click', () => showSlide(currentIndex + 1))

fullscreenButton.addEventListener('click', async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen()
  } else {
    await document.documentElement.requestFullscreen()
  }
})

window.addEventListener('hashchange', () => showSlide(readIndexFromHash(), false))

window.addEventListener('keydown', (event) => {
  const target = event.target
  if (target instanceof HTMLElement && target.matches('input, textarea, [contenteditable="true"]')) return

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    showSlide(currentIndex - 1)
  }

  if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'PageDown') {
    event.preventDefault()
    showSlide(currentIndex + 1)
  }

  if (event.key === 'PageUp') {
    event.preventDefault()
    showSlide(currentIndex - 1)
  }
})

showSlide(readIndexFromHash(), false)
