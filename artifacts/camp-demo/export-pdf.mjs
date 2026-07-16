import { mkdir, readFile, rm } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = resolve(scriptDirectory, '../..')
const outputDirectory = resolve(scriptDirectory, 'output')

const exportViewport = Object.freeze({ width: 1600, height: 900 })
const sectionOrder = Object.freeze(['main', 'appendix'])

const exportStyles = `
  @page {
    size: ${exportViewport.width}px ${exportViewport.height}px;
    margin: 0;
  }

  html.pdf-export,
  html.pdf-export body {
    width: ${exportViewport.width}px !important;
    height: auto !important;
    min-width: 0 !important;
    min-height: 0 !important;
    overflow: visible !important;
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
  }

  html.pdf-export .deck {
    width: ${exportViewport.width}px !important;
    height: auto !important;
    overflow: visible !important;
  }

  html.pdf-export .slide {
    width: ${exportViewport.width}px !important;
    height: ${exportViewport.height}px !important;
    min-width: ${exportViewport.width}px !important;
    min-height: ${exportViewport.height}px !important;
    max-width: ${exportViewport.width}px !important;
    max-height: ${exportViewport.height}px !important;
    break-after: page;
    page-break-after: always;
  }

  html.pdf-export .slide:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  html.pdf-export .slide > * {
    animation: none !important;
  }

  html.pdf-export .deck-controls {
    display: none !important;
  }
`

export function validateAndOrderSlides(slides) {
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error('Deck has no [data-slide] elements to export.')
  }

  const seenIds = new Set()

  slides.forEach((slide) => {
    if (typeof slide.id !== 'string' || slide.id.length === 0) {
      throw new Error('Every exported slide needs a non-empty data-slide-id.')
    }
    if (seenIds.has(slide.id)) {
      throw new Error(`Deck has duplicate data-slide-id: ${slide.id}`)
    }
    if (!sectionOrder.includes(slide.section)) {
      throw new Error(
        `Slide ${slide.id} has unsupported data-deck-section: ${slide.section}`,
      )
    }
    seenIds.add(slide.id)
  })

  const missingSections = sectionOrder.filter((section) => (
    !slides.some((slide) => slide.section === section)
  ))
  if (missingSections.length > 0) {
    throw new Error(
      `Deck has no slides for data-deck-section: ${missingSections.join(', ')}`,
    )
  }

  return sectionOrder.flatMap((section) => (
    slides.filter((slide) => slide.section === section)
  ))
}

export function countPdfPages(pdfBuffer) {
  const pdfSource = pdfBuffer.toString('latin1')
  return [...pdfSource.matchAll(/\/Type\s*\/Page\b/g)].length
}

export function deriveWeekSlug(slides) {
  const weekValues = slides
    .filter((slide) => slide.section === 'main' && slide.week !== null)
    .map((slide) => slide.week)

  if (weekValues.length === 0) {
    throw new Error('Deck has no main slide with data-week for the PDF slug.')
  }

  const weekNumbers = weekValues.map((week) => {
    if (typeof week !== 'string' || !/^[1-9]\d*$/.test(week)) {
      throw new Error(`Deck has invalid data-week for the PDF slug: ${week}`)
    }
    return Number(week)
  })

  return `week-${Math.max(...weekNumbers)}`
}

export function createDefaultPdfPath(slug) {
  if (!/^week-[1-9]\d*$/.test(slug)) {
    throw new Error(`Invalid camp demo PDF slug: ${slug}`)
  }
  return resolve(outputDirectory, `ay-ple-camp-demo-${slug}.pdf`)
}

async function createDeckServer() {
  const server = await createServer({
    root: workspaceRoot,
    appType: 'spa',
    clearScreen: false,
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
    },
  })

  await server.listen()
  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') {
    await server.close()
    throw new Error('Vite did not provide a local TCP port for PDF export.')
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}/artifacts/camp-demo/#product-promise`,
  }
}

async function readSlideManifest(page) {
  const rawSlides = await page.evaluate(() => (
    [...document.querySelectorAll('[data-slide]')].map((slide) => ({
      id: slide.dataset.slideId || '',
      section: slide.dataset.deckSection || '',
      week: slide.dataset.week || null,
    }))
  ))

  return validateAndOrderSlides(rawSlides)
}

async function prepareDeckForExport(page, slides, slug) {
  const slideIds = slides.map((slide) => slide.id)

  await page.evaluate(({ orderedIds, deckSlug }) => {
    const deck = document.querySelector('.deck')
    const slidesById = new Map(
      [...document.querySelectorAll('[data-slide]')].map((slide) => (
        [slide.dataset.slideId, slide]
      )),
    )

    if (!deck) throw new Error('Deck root .deck was not found.')

    const orderedSlides = orderedIds.map((id) => {
      const slide = slidesById.get(id)
      if (!slide) throw new Error(`Slide disappeared before export: ${id}`)
      slide.hidden = false
      slide.classList.remove('is-active')
      return slide
    })

    deck.replaceChildren(...orderedSlides)
    document.querySelectorAll('a').forEach((link) => {
      link.removeAttribute('href')
      link.removeAttribute('target')
      link.setAttribute('aria-disabled', 'true')
    })
    document.title = `AY-PLE Camp Demo · ${deckSlug}`
    document.documentElement.classList.add('pdf-export')
  }, { orderedIds: slideIds, deckSlug: slug })

  await page.addStyleTag({ content: exportStyles })
  await page.waitForFunction(() => (
    [...document.images].every((image) => image.complete)
  ))
  await page.evaluate(async () => {
    await document.fonts.ready
  })

  const failedImages = await page.evaluate(() => (
    [...document.images]
      .filter((image) => image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src)
  ))
  if (failedImages.length > 0) {
    throw new Error(`Deck images failed to load: ${failedImages.join(', ')}`)
  }

  const overflow = await page.evaluate((orderedIds) => (
    orderedIds.map((id) => {
      const slide = [...document.querySelectorAll('[data-slide]')].find((candidate) => (
        candidate.dataset.slideId === id
      ))
      if (!slide) return { id, missing: true }
      return {
        id,
        missing: false,
        horizontal: slide.scrollWidth > slide.clientWidth,
        vertical: slide.scrollHeight > slide.clientHeight,
      }
    })
  ), slideIds)
  const invalidSlides = overflow.filter((slide) => (
    slide.missing || slide.horizontal || slide.vertical
  ))
  if (invalidSlides.length > 0) {
    throw new Error(
      `Slides overflow the PDF page: ${invalidSlides.map((slide) => slide.id).join(', ')}`,
    )
  }
}

export async function exportCampDemoPdf(outputPath) {
  let resolvedOutputPath
  let browser
  let server

  try {
    const deckServer = await createDeckServer()
    server = deckServer.server
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: exportViewport })
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' })
    const response = await page.goto(deckServer.url, { waitUntil: 'networkidle' })
    if (!response?.ok()) {
      throw new Error(`Deck returned HTTP ${response?.status() ?? 'unknown'}.`)
    }
    if (pageErrors.length > 0) {
      throw new Error(`Deck page error: ${pageErrors.join('; ')}`)
    }

    const slides = await readSlideManifest(page)
    const slug = deriveWeekSlug(slides)
    resolvedOutputPath = resolve(outputPath ?? createDefaultPdfPath(slug))
    await mkdir(dirname(resolvedOutputPath), { recursive: true })
    await rm(resolvedOutputPath, { force: true })
    await prepareDeckForExport(page, slides, slug)
    await page.pdf({
      path: resolvedOutputPath,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      printBackground: true,
    })

    const pdfBuffer = await readFile(resolvedOutputPath)
    const pageCount = countPdfPages(pdfBuffer)
    if (pageCount !== slides.length) {
      throw new Error(
        `PDF page count ${pageCount} does not match Deck slide count ${slides.length}.`,
      )
    }

    return {
      outputPath: resolvedOutputPath,
      pageCount,
      slug,
      slides,
    }
  } catch (error) {
    if (resolvedOutputPath) await rm(resolvedOutputPath, { force: true })
    throw error
  } finally {
    await browser?.close()
    await server?.close()
  }
}

async function main() {
  const result = await exportCampDemoPdf()
  const relativeOutput = relative(workspaceRoot, result.outputPath)
  const mainCount = result.slides.filter((slide) => slide.section === 'main').length
  const appendixCount = result.slides.length - mainCount

  console.log(`Camp demo PDF exported: ${relativeOutput}`)
  console.log(`Slug: ${result.slug}`)
  console.log(
    `Pages: ${result.pageCount} (${mainCount} main, ${appendixCount} appendix)`,
  )
  console.log(`Order: ${result.slides.map((slide) => slide.id).join(' -> ')}`)
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isDirectExecution) {
  main().catch((error) => {
    console.error(`Camp demo PDF export failed: ${error.message}`)
    process.exitCode = 1
  })
}
