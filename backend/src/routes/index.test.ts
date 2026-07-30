import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../app'
import { AppError } from '../middlewares/errorHandler'

// 라우트/컨트롤러/미들웨어(zod 검증, multer 업로드, errorHandler)를 실제 Express 앱(app.ts)에 실어
// HTTP 요청으로 검증하는 통합 테스트. 서비스 레이어 아래(Prisma/Gemini/공공데이터 API)는 mock 처리해
// 외부 의존성 없이 라우팅 계층 전체가 올바르게 연결돼 있는지 확인한다.

const mocks = vi.hoisted(() => ({
  searchItems: vi.fn(),
  getItemDisposalRule: vi.fn(),
  recognizeItem: vi.fn(),
  getProvinces: vi.fn(),
  getDistrictsInProvince: vi.fn(),
  getZoneOptions: vi.fn(),
  getRegionRule: vi.fn(),
  getBulkyWasteItems: vi.fn(),
  getBulkyWasteFee: vi.fn(),
  getCollectionPoints: vi.fn(),
}))

vi.mock('../services/itemService', () => ({
  searchItems: mocks.searchItems,
  getItemDisposalRule: mocks.getItemDisposalRule,
}))

vi.mock('../services/recognizeService', () => ({
  recognizeItem: mocks.recognizeItem,
}))

vi.mock('../services/regionRuleService', () => ({
  getProvinces: mocks.getProvinces,
  getDistrictsInProvince: mocks.getDistrictsInProvince,
  getZoneOptions: mocks.getZoneOptions,
  getRegionRule: mocks.getRegionRule,
}))

vi.mock('../services/bulkyWasteService', () => ({
  getBulkyWasteItems: mocks.getBulkyWasteItems,
  getBulkyWasteFee: mocks.getBulkyWasteFee,
}))

vi.mock('../services/collectionPointService', () => ({
  getCollectionPoints: mocks.getCollectionPoints,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/health', () => {
  it('상태를 ok로 응답한다', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('GET /api/items/search', () => {
  it('q 파라미터로 조회한 결과를 반환한다', async () => {
    mocks.searchItems.mockResolvedValue([{ id: '1', name: '페트병' }])

    const res = await request(app).get('/api/items/search').query({ q: '페트' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ items: [{ id: '1', name: '페트병' }] })
    expect(mocks.searchItems).toHaveBeenCalledWith('페트')
  })

  it('q 파라미터가 없으면 400과 함께 서비스는 호출하지 않는다', async () => {
    const res = await request(app).get('/api/items/search')

    expect(res.status).toBe(400)
    expect(mocks.searchItems).not.toHaveBeenCalled()
  })
})

describe('GET /api/items/:id/disposal-rule', () => {
  it('품목 배출 규정을 반환한다', async () => {
    mocks.getItemDisposalRule.mockResolvedValue({ item: { id: '1' }, disposalRule: { method: '헹궈서 배출' } })

    const res = await request(app).get('/api/items/1/disposal-rule')

    expect(res.status).toBe(200)
    expect(res.body.disposalRule.method).toBe('헹궈서 배출')
  })

  it('서비스가 AppError(404)를 던지면 errorHandler가 동일한 상태코드로 응답한다', async () => {
    mocks.getItemDisposalRule.mockRejectedValue(new AppError('품목을 찾을 수 없습니다', 404))

    const res = await request(app).get('/api/items/unknown/disposal-rule')

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('품목을 찾을 수 없습니다')
  })
})

describe('POST /api/recognize', () => {
  it('사진 없이 요청하면 400을 반환하고 서비스를 호출하지 않는다', async () => {
    const res = await request(app).post('/api/recognize')

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('사진 파일이 필요합니다')
    expect(mocks.recognizeItem).not.toHaveBeenCalled()
  })

  it('지원하지 않는 파일 형식이면 multer fileFilter가 400으로 막는다', async () => {
    const res = await request(app)
      .post('/api/recognize')
      .attach('photo', Buffer.from('not-an-image'), { filename: 'a.txt', contentType: 'text/plain' })

    expect(res.status).toBe(400)
    expect(mocks.recognizeItem).not.toHaveBeenCalled()
  })

  it('정상 이미지면 인식 결과를 반환한다', async () => {
    mocks.recognizeItem.mockResolvedValue({ item: { id: '1', name: '페트병' }, disposalRule: {} })

    const res = await request(app)
      .post('/api/recognize')
      .attach('photo', Buffer.from('fake-image-bytes'), { filename: 'a.jpg', contentType: 'image/jpeg' })

    expect(res.status).toBe(200)
    expect(res.body.item.name).toBe('페트병')
    expect(mocks.recognizeItem).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: 'image/jpeg' }),
    )
  })

  it('인식 실패(AppError 404)면 그대로 전달된다', async () => {
    mocks.recognizeItem.mockRejectedValue(new AppError('사진에서 물체를 인식하지 못했습니다', 404, { rawLabel: null }))

    const res = await request(app)
      .post('/api/recognize')
      .attach('photo', Buffer.from('fake-image-bytes'), { filename: 'a.jpg', contentType: 'image/jpeg' })

    expect(res.status).toBe(404)
    expect(res.body.rawLabel).toBeNull()
  })
})

describe('GET /api/regions/provinces', () => {
  it('시/도 목록을 반환한다', async () => {
    mocks.getProvinces.mockResolvedValue([{ name: '부산광역시', nameEn: 'Busan' }])

    const res = await request(app).get('/api/regions/provinces')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ provinces: [{ name: '부산광역시', nameEn: 'Busan' }] })
  })
})

describe('GET /api/regions/districts', () => {
  it('ctpvNm으로 구/군 목록을 반환한다', async () => {
    mocks.getDistrictsInProvince.mockResolvedValue([{ name: '해운대구', nameEn: 'Haeundae-gu' }])

    const res = await request(app).get('/api/regions/districts').query({ ctpvNm: '부산광역시' })

    expect(res.status).toBe(200)
    expect(mocks.getDistrictsInProvince).toHaveBeenCalledWith('부산광역시')
  })

  it('ctpvNm이 없으면 400을 반환한다', async () => {
    const res = await request(app).get('/api/regions/districts')

    expect(res.status).toBe(400)
    expect(mocks.getDistrictsInProvince).not.toHaveBeenCalled()
  })
})

describe('GET /api/regions/zones', () => {
  it('ctpvNm, sggNm으로 구역 옵션을 반환한다', async () => {
    mocks.getZoneOptions.mockResolvedValue({ covered: true, districtWide: true, dongOptions: [], alternativeDistricts: [] })

    const res = await request(app).get('/api/regions/zones').query({ ctpvNm: '부산광역시', sggNm: '해운대구' })

    expect(res.status).toBe(200)
    expect(mocks.getZoneOptions).toHaveBeenCalledWith('부산광역시', '해운대구')
  })

  it('sggNm이 없으면 400을 반환한다', async () => {
    const res = await request(app).get('/api/regions/zones').query({ ctpvNm: '부산광역시' })

    expect(res.status).toBe(400)
    expect(mocks.getZoneOptions).not.toHaveBeenCalled()
  })
})

describe('GET /api/regions/rules', () => {
  it('ctpvNm, sggNm, dongNm으로 지역 규정을 반환한다', async () => {
    mocks.getRegionRule.mockResolvedValue({ id: 'rule-1' })

    const res = await request(app)
      .get('/api/regions/rules')
      .query({ ctpvNm: '부산광역시', sggNm: '해운대구', dongNm: '우동' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ regionRule: { id: 'rule-1' } })
    expect(mocks.getRegionRule).toHaveBeenCalledWith('부산광역시', '해운대구', '우동')
  })

  it('dongNm이 없으면 400을 반환한다', async () => {
    const res = await request(app).get('/api/regions/rules').query({ ctpvNm: '부산광역시', sggNm: '해운대구' })

    expect(res.status).toBe(400)
    expect(mocks.getRegionRule).not.toHaveBeenCalled()
  })
})

describe('GET /api/bulky-waste/items', () => {
  it('ctpvNm, sggNm으로 대형폐기물 품목 목록을 반환한다', async () => {
    mocks.getBulkyWasteItems.mockResolvedValue([{ itemName: '침대' }])

    const res = await request(app).get('/api/bulky-waste/items').query({ ctpvNm: '부산광역시', sggNm: '해운대구' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ items: [{ itemName: '침대' }] })
  })
})

describe('GET /api/bulky-waste', () => {
  it('ctpvNm, sggNm, itemName으로 수수료를 반환한다', async () => {
    mocks.getBulkyWasteFee.mockResolvedValue({ fee: 5000 })

    const res = await request(app)
      .get('/api/bulky-waste')
      .query({ ctpvNm: '부산광역시', sggNm: '해운대구', itemName: '침대' })

    expect(res.status).toBe(200)
    expect(mocks.getBulkyWasteFee).toHaveBeenCalledWith('부산광역시', '해운대구', '침대')
  })

  it('itemName이 없으면 400을 반환한다', async () => {
    const res = await request(app).get('/api/bulky-waste').query({ ctpvNm: '부산광역시', sggNm: '해운대구' })

    expect(res.status).toBe(400)
    expect(mocks.getBulkyWasteFee).not.toHaveBeenCalled()
  })
})

describe('GET /api/collection-points', () => {
  it('유효한 category면 목록을 반환한다', async () => {
    mocks.getCollectionPoints.mockResolvedValue([{ name: '해운대구청 건전지함' }])

    const res = await request(app)
      .get('/api/collection-points')
      .query({ category: '건전지', ctpvNm: '부산광역시', sggNm: '해운대구' })

    expect(res.status).toBe(200)
    expect(mocks.getCollectionPoints).toHaveBeenCalledWith('건전지', '부산광역시', '해운대구')
  })

  it('유효하지 않은 category면 400을 반환하고 서비스는 호출하지 않는다', async () => {
    const res = await request(app)
      .get('/api/collection-points')
      .query({ category: '존재하지않는카테고리', ctpvNm: '부산광역시', sggNm: '해운대구' })

    expect(res.status).toBe(400)
    expect(mocks.getCollectionPoints).not.toHaveBeenCalled()
  })
})
