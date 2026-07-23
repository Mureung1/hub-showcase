import { httpError } from '../lib/httpError.js'
import { CATEGORIES } from './storeService.js'
import { notifyDealCreated } from './notificationService.js'
import * as dealRepo from '../repositories/dealRepository.js'
import * as storeRepo from '../repositories/storeRepository.js'
import * as userRepo from '../repositories/userRepository.js'

// W2 딜 등록 — 등록 즉시 remaining_qty = total_qty, status = 'active'
export async function createDeal(
  userId,
  { name, category, originalPrice, salePrice, totalQty, pickupDeadlineAt },
) {
  if (!name?.trim()) throw httpError(400, '상품명을 입력해주세요.')
  if (!CATEGORIES.includes(category)) throw httpError(400, '카테고리를 선택해주세요.')
  if (!Number.isInteger(totalQty) || totalQty <= 0) {
    throw httpError(400, '수량은 1개 이상이어야 합니다.')
  }
  if (!Number.isInteger(originalPrice) || originalPrice <= 0) {
    throw httpError(400, '원가가 올바르지 않습니다.')
  }
  if (!Number.isInteger(salePrice) || salePrice <= 0) {
    throw httpError(400, '할인가가 올바르지 않습니다.')
  }
  if (salePrice >= originalPrice) throw httpError(400, '할인가는 원가보다 낮아야 합니다.')

  const deadline = new Date(pickupDeadlineAt)
  if (Number.isNaN(deadline.getTime())) throw httpError(400, '픽업 마감 시각이 올바르지 않습니다.')
  if (deadline <= new Date()) throw httpError(400, '픽업 마감은 현재 시각 이후여야 합니다.')

  const store = await storeRepo.findByOwnerId(userId)
  if (!store) throw httpError(404, '가게를 먼저 등록해주세요.')

  const deal = await dealRepo.insert({
    storeId: store.id,
    name: name.trim(),
    category,
    originalPrice,
    salePrice,
    totalQty,
    pickupDeadlineAt: deadline.toISOString(),
  })

  // 알림 트리거 (T-11) — 등록 응답을 막지 않도록 await 하지 않는다(실패해도 내부에서 삼킨다)
  notifyDealCreated(deal, store.name)

  return deal
}

// W3 대시보드 — 가게별 딜 목록 + 예약/픽업 집계
export async function listDealsByStore(storeId) {
  if (!Number.isInteger(storeId) || storeId <= 0) {
    throw httpError(400, 'storeId가 올바르지 않습니다.')
  }
  return dealRepo.findByStoreIdWithCounts(storeId)
}

/*
 * M2 소비자 딜 목록 — 사용자 기준 위치에서 반경 내 활성 딜을 거리순으로 (T-06).
 * always 모드 사용자도 목록은 반경으로 제한한다(무한 목록 방지). 알림은 T-11에서 별도 처리.
 */
export async function listNearbyDeals(userId) {
  const user = await userRepo.findById(userId)
  if (!user) throw httpError(401, '존재하지 않는 사용자입니다.')
  if (user.baseLat == null || user.baseLng == null) {
    throw httpError(400, '기준 위치가 설정되지 않았습니다.')
  }
  return dealRepo.findNearby({
    lat: user.baseLat,
    lng: user.baseLng,
    radiusKm: user.notiRadiusKm,
  })
}

// M3 딜 상세 — 요청자 기준 거리 포함. 비활성/없는 딜은 404.
export async function getDealDetail(userId, dealId) {
  if (!Number.isInteger(dealId) || dealId <= 0) throw httpError(400, '딜 ID가 올바르지 않습니다.')

  const user = await userRepo.findById(userId)
  if (!user) throw httpError(401, '존재하지 않는 사용자입니다.')

  const deal = await dealRepo.findByIdWithStore(dealId, {
    lat: user.baseLat,
    lng: user.baseLng,
  })
  if (!deal) throw httpError(404, '존재하지 않는 딜입니다.')
  // 만료 잡(T-14)이 아직 돌지 않은 창에서도 마감된 딜이 열리지 않도록 시각도 함께 검사한다
  if (deal.status !== 'active' || new Date(deal.pickupDeadlineAt) <= new Date()) {
    throw httpError(404, '마감되었거나 판매 종료된 딜입니다.')
  }
  return deal
}
