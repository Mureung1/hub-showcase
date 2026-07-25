import 'dotenv/config'
import { z } from 'zod'
import { prisma } from '../src/config/prisma'
import { generateGeminiText } from '../src/services/geminiClient'

// 한 번에 너무 많은 품목을 요청하면 응답 JSON이 잘리거나 일부 id가 누락될 위험이 있어 배치로 나눈다.
const BATCH_SIZE = 50
// Gemini 무료 티어의 분당 요청 제한(RPM)에 걸리지 않도록 배치 사이에 간격을 둔다.
const DELAY_MS = 4000

const translationSchema = z.array(z.object({ id: z.string(), nameEn: z.string() }))

const PROMPT_PREFIX =
  '너는 대한민국 공공데이터포털에 등록된 생활 폐기물 품목명을 영어로 번역하는 도우미다. ' +
  '각 품목명을 그 물건을 정확히 지칭하는 자연스러운 영어 명사구로 번역하라 — 새로운 분리배출 규정이나 설명을 만들지 말고 오직 이름만 번역하라. ' +
  '함께 주어지는 "method" 힌트는 모호한 품목명을 구분하기 위한 참고용일 뿐, 번역 결과에 포함하지 마라. ' +
  '입력에 있는 모든 id를 빠짐없이, 정확히 한 번씩만 포함해 다음 JSON 형식으로만 답하라: ' +
  '[{"id": string, "nameEn": string}, ...]'

interface ItemToTranslate {
  id: string
  name: string
  method: string | null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

async function translateBatch(batch: ItemToTranslate[]): Promise<Map<string, string>> {
  const input = batch.map(({ id, name, method }) => ({ id, name, ...(method ? { method } : {}) }))
  const text = await generateGeminiText([`${PROMPT_PREFIX}\n${JSON.stringify(input)}`], {
    responseMimeType: 'application/json',
  })

  const parsed = translationSchema.parse(JSON.parse(text))
  return new Map(parsed.map(({ id, nameEn }) => [id, nameEn]))
}

async function main() {
  // nameEn이 이미 채워진 항목은 건너뛰어 재실행해도 안전하다(중단 후 재개 가능).
  const items = await prisma.item.findMany({
    where: { nameEn: null },
    select: { id: true, name: true, disposalRule: { select: { method: true } } },
    orderBy: { name: 'asc' },
  })
  console.log(`translating ${items.length} items without nameEn`)

  const batches = chunk(
    items.map(({ id, name, disposalRule }) => ({ id, name, method: disposalRule?.method ?? null })),
    BATCH_SIZE,
  )

  let translatedCount = 0
  for (const [index, batch] of batches.entries()) {
    const translations = await translateBatch(batch)

    for (const item of batch) {
      const nameEn = translations.get(item.id)
      if (!nameEn) {
        console.warn(`no translation returned for "${item.name}" (${item.id}), skipping`)
        continue
      }
      await prisma.item.update({ where: { id: item.id }, data: { nameEn } })
      translatedCount += 1
    }

    console.log(`batch ${index + 1}/${batches.length} done (${translatedCount}/${items.length} translated so far)`)
    if (index < batches.length - 1) {
      await sleep(DELAY_MS)
    }
  }

  console.log('sync complete')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
