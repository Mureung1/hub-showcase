import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCollectionPoints } from './collectionPointService'

const mocks = vi.hoisted(() => ({
  collectionPointFindMany: vi.fn(),
}))

vi.mock('../config/prisma', () => ({
  prisma: {
    collectionPoint: { findMany: mocks.collectionPointFindMany },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getCollectionPoints', () => {
  it('통과시킨다 — 병합 라벨이 아닌 일반 ctpvNm은 그대로', async () => {
    await getCollectionPoints('건전지', '부산광역시', '해운대구')

    expect(mocks.collectionPointFindMany).toHaveBeenCalledWith({
      where: { category: '건전지', ctpvNm: '부산광역시', sggNm: '해운대구' },
      orderBy: { name: 'asc' },
    })
  })

  it('전남광주통합특별시 + 광주 구 이름이면 광주광역시로 변환한다', async () => {
    await getCollectionPoints('의류', '전남광주통합특별시', '남구')

    expect(mocks.collectionPointFindMany).toHaveBeenCalledWith({
      where: { category: '의류', ctpvNm: '광주광역시', sggNm: '남구' },
      orderBy: { name: 'asc' },
    })
  })

  it('전남광주통합특별시 + 광주 구가 아니면 전라남도로 변환한다', async () => {
    await getCollectionPoints('폐의약품', '전남광주통합특별시', '강진군')

    expect(mocks.collectionPointFindMany).toHaveBeenCalledWith({
      where: { category: '폐의약품', ctpvNm: '전라남도', sggNm: '강진군' },
      orderBy: { name: 'asc' },
    })
  })
})
