import { httpError } from '../lib/httpError.js'
import * as storeRepo from '../repositories/storeRepository.js'
import * as userRepo from '../repositories/userRepository.js'

export const CATEGORIES = ['베이커리', '디저트', '신선식품', '반찬', '음료']

export async function getMyStore(userId) {
  const store = await storeRepo.findByOwnerId(userId)
  if (!store) throw httpError(404, '등록된 가게가 없습니다.')
  return store
}

export async function createStore(userId, { name, category, address, lat, lng }) {
  if (!name?.trim() || !address?.trim()) throw httpError(400, '상호명과 주소를 입력해주세요.')
  if (!CATEGORIES.includes(category)) throw httpError(400, '카테고리를 선택해주세요.')
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw httpError(400, '위치 좌표가 올바르지 않습니다.')
  }

  // role 정합성은 서비스 레이어 담당 (docs/erd.md 결정)
  const user = await userRepo.findById(userId)
  if (!user) throw httpError(401, '존재하지 않는 사용자입니다.')
  if (user.role !== 'owner') throw httpError(403, '사장님 계정만 가게를 등록할 수 있습니다.')

  const existing = await storeRepo.findByOwnerId(userId)
  if (existing) throw httpError(409, '이미 등록된 가게가 있습니다.')

  return storeRepo.insert({
    ownerId: userId,
    name: name.trim(),
    category,
    address: address.trim(),
    lat,
    lng,
  })
}
