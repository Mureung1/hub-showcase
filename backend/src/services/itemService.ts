import type { Prisma } from '@prisma/client'
import { prisma } from '../config/prisma'
import { AppError } from '../middlewares/errorHandler'
import { getDisposalApiClient } from './disposalApiClient'
import { getExplanationClient } from './explanationClient'

export function searchItems(query: string) {
  return prisma.item.findMany({
    where: { name: { contains: query, mode: 'insensitive' } },
    orderBy: { name: 'asc' },
  })
}

export function findItemByName(name: string) {
  return prisma.item.findUnique({ where: { name } })
}

// Vision AI 프롬프트에 참고 목록으로 제공 — responseSchema enum은 731개 규모에서 API가 거부해서(too much
// branching) 쓸 수 없으므로, 대신 일반 텍스트로 목록을 보여주고 정확한 표기를 그대로 쓰도록 유도한다.
export async function getAllItemNames(): Promise<string[]> {
  const items = await prisma.item.findMany({ select: { name: true }, orderBy: { name: 'asc' } })
  return items.map((item) => item.name)
}

// Vision AI의 한국어 추측 라벨을 731개 동기화된 품목 중 가장 가까운 것과 매칭 — 하드코딩 사전 대신 전체 카탈로그를 활용.
// 공백 제거 후 비교하는 이유: "헤어스프레이"(추측) vs "헤어 스프레이"(카탈로그 표기)처럼 같은 단어라도 띄어쓰기가
// 달라 SQL contains(ILIKE)로는 매칭되지 않는 경우가 실제로 확인됨 — 731개는 메모리에 올려 비교해도 무리 없는 크기.
export async function findBestMatchingItem(query: string) {
  const normalizedQuery = query.replace(/\s+/g, '')
  if (!normalizedQuery) {
    return null
  }

  const items = await prisma.item.findMany({ orderBy: { name: 'asc' } })

  const exact = items.find((item) => item.name.replace(/\s+/g, '') === normalizedQuery)
  if (exact) {
    return exact
  }

  return items.find((item) => item.name.replace(/\s+/g, '').includes(normalizedQuery)) ?? null
}

export async function getItemDisposalRule(itemId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } })
  if (!item) {
    throw new AppError('품목을 찾을 수 없습니다', 404)
  }

  let disposalRule = await prisma.disposalRule.findUnique({ where: { itemId } })

  if (!disposalRule) {
    const [govItem] = await getDisposalApiClient().fetchDisposalMethod(item.name)
    if (!govItem) {
      throw new AppError('해당 품목의 배출방법 정보를 찾을 수 없습니다', 404)
    }

    disposalRule = await prisma.disposalRule.create({
      data: {
        itemId: item.id,
        govItemName: govItem.itemNm,
        method: govItem.dschgMthd,
      },
    })
  }

  if (!disposalRule.explainedAt) {
    const explanation = await getExplanationClient().generateExplanation(
      disposalRule.govItemName,
      disposalRule.method,
    )
    disposalRule = await prisma.disposalRule.update({
      where: { itemId },
      data: {
        steps: explanation.steps,
        parts: explanation.parts as unknown as Prisma.InputJsonValue,
        commonMistakes: explanation.commonMistakes,
        reason: explanation.reason,
        explainedAt: new Date(),
      },
    })
  }

  return { item, disposalRule }
}
