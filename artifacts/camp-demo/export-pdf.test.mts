import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultPdfPath,
  countPdfPages,
  deriveWeekSlug,
  validateAndOrderSlides,
} from './export-pdf.mts'

test('slide export order follows main then appendix without fixed counts', () => {
  const ordered = validateAndOrderSlides([
    { id: 'product-promise', section: 'main', week: null },
    { id: 'appendix-runtime', section: 'appendix' },
    { id: 'week-3', section: 'main', week: '3' },
    { id: 'appendix-sdk', section: 'appendix' },
  ])

  assert.deepEqual(
    ordered.map((slide) => slide.id),
    ['product-promise', 'week-3', 'appendix-runtime', 'appendix-sdk'],
  )
})

test('the latest data-week becomes the reusable PDF slug and filename', () => {
  const slides = [
    { id: 'week-1', section: 'main', week: '1' },
    { id: 'week-3', section: 'main', week: '3' },
    { id: 'appendix-runtime', section: 'appendix', week: null },
  ]

  assert.equal(deriveWeekSlug(slides), 'week-3')
  assert.match(
    createDefaultPdfPath('week-3'),
    /output\/ay-ple-camp-demo-week-3\.pdf$/,
  )
  assert.throws(
    () => deriveWeekSlug([
      { id: 'week-x', section: 'main', week: 'next' },
      { id: 'appendix-runtime', section: 'appendix', week: null },
    ]),
    /data-week/,
  )
})

test('slide export rejects missing, duplicate, and unknown identifiers', () => {
  assert.throws(
    () => validateAndOrderSlides([{ id: '', section: 'main' }]),
    /data-slide-id/,
  )
  assert.throws(
    () => validateAndOrderSlides([
      { id: 'week-1', section: 'main' },
      { id: 'week-1', section: 'appendix' },
    ]),
    /duplicate data-slide-id/,
  )
  assert.throws(
    () => validateAndOrderSlides([{ id: 'notes', section: 'speaker' }]),
    /data-deck-section/,
  )
  assert.throws(
    () => validateAndOrderSlides([{ id: 'product-promise', section: 'main' }]),
    /appendix/,
  )
})

test('Chromium PDF page objects can be counted without another runtime dependency', () => {
  const pdf = Buffer.from([
    '%PDF-1.4',
    '1 0 obj <</Type /Pages /Count 2>> endobj',
    '2 0 obj <</Type /Page /Parent 1 0 R>> endobj',
    '3 0 obj <</Type/Page/Parent 1 0 R>> endobj',
    '%%EOF',
  ].join('\n'), 'latin1')

  assert.equal(countPdfPages(pdf), 2)
})
