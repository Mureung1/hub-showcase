import { withTransaction } from '../db/withTransaction.js'
import { httpError } from '../lib/httpError.js'
import { CATEGORIES } from './storeService.js'
import * as userRepo from '../repositories/userRepository.js'
import * as favoriteRepo from '../repositories/favoriteRepository.js'
import * as storeRepo from '../repositories/storeRepository.js'

const LOCATION_MODES = ['radius', 'always']

// M5 — 내 알림 설정 조회
export async function getMySettings(userId) {
  const user = await userRepo.findById(userId)
  if (!user) throw httpError(401, '존재하지 않는 사용자입니다.')
  const interests = await userRepo.listInterestCategories(userId)
  return {
    id: user.id,
    nickname: user.nickname,
    role: user.role,
    baseAddress: user.baseAddress,
    notiLocationMode: user.notiLocationMode,
    notiRadiusKm: Number(user.notiRadiusKm),
    interests,
  }
}

/*
 * M5 — 알림 설정 저장. 관심 카테고리는 전체 교체이므로
 * 삭제·삽입과 설정 갱신이 함께 성공하도록 트랜잭션으로 묶는다.
 */
export async function updateMySettings(userId, { interests, notiLocationMode, notiRadiusKm }) {
  if (interests !== undefined) {
    if (!Array.isArray(interests)) throw httpError(400, '관심 카테고리 형식이 올바르지 않습니다.')
    const invalid = interests.filter((c) => !CATEGORIES.includes(c))
    if (invalid.length > 0) throw httpError(400, `알 수 없는 카테고리: ${invalid.join(', ')}`)
  }
  if (notiLocationMode !== undefined && !LOCATION_MODES.includes(notiLocationMode)) {
    throw httpError(400, '위치 조건이 올바르지 않습니다.')
  }
  if (notiRadiusKm !== undefined) {
    const radius = Number(notiRadiusKm)
    if (!Number.isFinite(radius) || radius <= 0 || radius > 50) {
      throw httpError(400, '알림 반경은 0보다 크고 50km 이하여야 합니다.')
    }
  }

  await withTransaction(async (client) => {
    if (interests !== undefined) {
      await userRepo.replaceInterestCategories(userId, [...new Set(interests)], client)
    }
    if (notiLocationMode !== undefined || notiRadiusKm !== undefined) {
      await userRepo.updateNotificationSettings(userId, { notiLocationMode, notiRadiusKm }, client)
    }
  })

  return getMySettings(userId)
}

// M1 — 가게 검색 (즐겨찾기 여부 포함)
export async function searchStores(userId, keyword) {
  return storeRepo.searchWithFavorite({ userId, keyword: keyword?.trim() })
}

// M1 — 즐겨찾기 추가/삭제
export async function addFavorite(userId, storeId) {
  const id = Number(storeId)
  if (!Number.isInteger(id) || id <= 0) throw httpError(400, '가게 ID가 올바르지 않습니다.')
  const store = await storeRepo.findById(id)
  if (!store) throw httpError(404, '존재하지 않는 가게입니다.')
  await favoriteRepo.add(userId, id)
  return { storeId: id, isFavorite: true }
}

export async function removeFavorite(userId, storeId) {
  const id = Number(storeId)
  if (!Number.isInteger(id) || id <= 0) throw httpError(400, '가게 ID가 올바르지 않습니다.')
  await favoriteRepo.remove(userId, id)
  return { storeId: id, isFavorite: false }
}
