import { chromium } from '@playwright/test'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// 데모데이 A3 포스터 2장을 정확한 mm 크기의 PDF로 뽑는다.
// 브라우저 수동 인쇄는 브라우저마다 여백/축소가 달라질 수 있어,
// Playwright로 고정된 크기를 강제해 인쇄소 발주용 PDF를 만든다.
const posters = ['poster-project', 'poster-workflow']

const browser = await chromium.launch()
const page = await browser.newPage()

for (const name of posters) {
  const htmlPath = path.resolve('docs/diagrams', `${name}.html`)
  await page.goto(pathToFileURL(htmlPath).href)
  await page.evaluate(() => document.fonts.ready)
  await page.pdf({
    path: path.resolve('docs/diagrams', `${name}.pdf`),
    width: '297mm',
    height: '420mm',
    printBackground: true,
    margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
  })
  console.log(`${name}.pdf 생성 완료`)
}

await browser.close()
