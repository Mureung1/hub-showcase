import { withTransaction, trySavepoint } from '../db/withTransaction.js'
import { httpError } from '../lib/httpError.js'
import * as dealRepo from '../repositories/dealRepository.js'
import * as reservationRepo from '../repositories/reservationRepository.js'
import * as storeRepo from '../repositories/storeRepository.js'
import { notifyReservationCreated } from './notificationService.js'

const CODE_ATTEMPTS = 5
const randomCode = () => String(Math.floor(1000 + Math.random() * 9000))

/*
 * 예약 생성 (T-08) — 이 프로젝트의 기술 셀링포인트.
 *
 * 오버셀 방지의 핵심은 "확인 후 차감"이 아니라 조건부 UPDATE 한 문장이다
 * (dealRepository.decrementStock 참고). 차감과 예약 INSERT가 같은 트랜잭션·같은 연결에서
 * 실행되도록 withTransaction이 잡은 client를 repository에 넘긴다.
 */
export async function createReservation(userId, { dealId, qty }) {
  const id = Number(dealId)
  const quantity = Number(qty)
  if (!Number.isInteger(id) || id <= 0) throw httpError(400, '딜 ID가 올바르지 않습니다.')
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw httpError(400, '수량은 1개 이상이어야 합니다.')
  }

  const reservation = await withTransaction(async (client) => {
    const deal = await dealRepo.decrementStock(id, quantity, client)

    if (!deal) {
      // 실패 원인 구분 (같은 트랜잭션 안에서 읽기)
      const current = await dealRepo.findById(id, client)
      if (!current) throw httpError(404, '존재하지 않는 딜입니다.')
      if (new Date(current.pickupDeadlineAt) <= new Date()) {
        throw httpError(409, '픽업 마감 시간이 지났습니다.')
      }
      if (current.status !== 'active' || current.remainingQty < quantity) {
        throw httpError(409, '죄송해요, 방금 품절됐어요.')
      }
      throw httpError(409, '예약에 실패했습니다. 다시 시도해주세요.')
    }

    // 픽업코드 발급 — 활성 예약 중 유일해야 한다(partial unique index).
    // 충돌(23505) 시 트랜잭션 전체가 aborted 되지 않도록 세이브포인트로 되돌리고 재시도한다.
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
      const pickupCode = randomCode()
      const reservation = await trySavepoint(
        client,
        'issue_code',
        () => reservationRepo.insert({ dealId: id, userId, qty: quantity, pickupCode }, client),
        (err) => err.code === '23505', // 유니크 위반만 재시도, 나머지는 전파
      )
      if (reservation) {
        return {
          ...reservation,
          dealName: deal.name,
          remainingQty: deal.remainingQty,
          pickupDeadlineAt: deal.pickupDeadlineAt,
        }
      }
    }
    throw httpError(500, '픽업코드 발급에 실패했습니다. 다시 시도해주세요.')
  })

  // 커밋 이후에 사장님 알림 (T-17) — 알림 실패가 예약을 되돌리지 않도록 await 하지 않는다
  notifyReservationCreated(reservation)

  return reservation
}

/*
 * 픽업 확인 (T-10) — 사장님이 코드를 검증해 완료 처리한다.
 * 조회 시 FOR UPDATE로 행을 잠가 동시 확인 요청을 직렬화한다(중복 처리 차단).
 */
export async function confirmPickup(userId, pickupCode) {
  const code = String(pickupCode ?? '').trim()
  if (!/^\d{4}$/.test(code)) throw httpError(400, '픽업코드는 4자리 숫자입니다.')

  const store = await storeRepo.findByOwnerId(userId)
  if (!store) throw httpError(403, '가게 사장님만 픽업을 확인할 수 있습니다.')

  return withTransaction(async (client) => {
    const reservation = await reservationRepo.findActiveByCodeForUpdate(code, store.id, client)
    if (!reservation) throw httpError(404, '유효하지 않거나 이미 처리된 코드입니다.')

    await reservationRepo.markPicked(reservation.id, client)

    return {
      id: reservation.id,
      pickupCode: reservation.pickupCode,
      qty: reservation.qty,
      dealName: reservation.dealName,
      salePrice: reservation.salePrice,
      nickname: reservation.nickname,
      status: 'picked',
    }
  })
}

// 내 예약 목록 (M4)
export async function listMyReservations(userId) {
  return reservationRepo.listByUserId(userId)
}

// 사장님 — 내 가게에 들어온 예약 목록
export async function listStoreReservations(userId) {
  const store = await storeRepo.findByOwnerId(userId)
  if (!store) throw httpError(403, '가게 사장님만 예약을 볼 수 있습니다.')
  return reservationRepo.listByStoreId(store.id)
}
