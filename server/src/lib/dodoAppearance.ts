import type { RoomEquipSlot } from '@prisma/client'
import { prisma } from '../db.js'

// DodoAppearance의 bodyColor/eyeShape/eyeColor는 NOT NULL이라 항상 값이 있어야 하는데,
// 처음 생성되는 시점(온보딩 전)엔 .home-dodo CSS에 원래 하드코딩돼 있던 값과 동일한 기본값으로 채운다.
// eyeCount는 스키마 기본값(2)과 동일한 값을 코드에도 명시해 mock 테스트가 실제 DB 기본값에 의존하지 않게 한다.
const DEFAULT_APPEARANCE = { bodyColor: '#f2a58d', eyeShape: 'round', eyeColor: '#344b46', eyeCount: 2 }

const APPEARANCE_INCLUDE = { hatItem: true, glassesItem: true, outfitItem: true, accessoryItem: true } as const

const SLOT_FIELD: Record<RoomEquipSlot, 'hatItemId' | 'glassesItemId' | 'outfitItemId' | 'accessoryItemId'> = {
  HAT: 'hatItemId',
  GLASSES: 'glassesItemId',
  OUTFIT: 'outfitItemId',
  ACCESSORY: 'accessoryItemId',
}

// 없으면 기본값으로 생성 — routes/dodo.ts의 GET /state가 DodoState를 다루는 방식과 동일한 upsert 패턴.
export async function getDodoAppearance(userId: string) {
  return prisma.dodoAppearance.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_APPEARANCE },
    update: {},
    include: APPEARANCE_INCLUDE,
  })
}

// colorCustomizable 아이템은 RoomItem 하나에 여러 색 인스턴스(UserInventory)가 있을 수 있는데
// hatItemId 등 슬롯 FK는 RoomItem만 가리키므로, 실제로 장착한 인스턴스의 색은 별도 컬럼에 같이 저장한다.
function setSlot(userId: string, slot: RoomEquipSlot, itemId: string | null, color: string | null) {
  const base = { userId, ...DEFAULT_APPEARANCE }
  switch (slot) {
    case 'HAT':
      return prisma.dodoAppearance.upsert({
        where: { userId }, create: { ...base, hatItemId: itemId, hatColor: color }, update: { hatItemId: itemId, hatColor: color }, include: APPEARANCE_INCLUDE,
      })
    case 'GLASSES':
      return prisma.dodoAppearance.upsert({
        where: { userId }, create: { ...base, glassesItemId: itemId, glassesColor: color }, update: { glassesItemId: itemId, glassesColor: color }, include: APPEARANCE_INCLUDE,
      })
    case 'OUTFIT':
      return prisma.dodoAppearance.upsert({
        where: { userId }, create: { ...base, outfitItemId: itemId, outfitColor: color }, update: { outfitItemId: itemId, outfitColor: color }, include: APPEARANCE_INCLUDE,
      })
    case 'ACCESSORY':
      return prisma.dodoAppearance.upsert({
        where: { userId }, create: { ...base, accessoryItemId: itemId, accessoryColor: color }, update: { accessoryItemId: itemId, accessoryColor: color }, include: APPEARANCE_INCLUDE,
      })
  }
}

type AppearanceWithItems = Awaited<ReturnType<typeof getDodoAppearance>>

function toSlotResponse(item: AppearanceWithItems['hatItem'], color: string | null) {
  return item ? { itemId: item.id, iconKey: item.iconKey, color } : null
}

// 친구 마이홈 방문(routes/friends.ts)에서도 그대로 재사용되는 공용 응답 — bodyColor/eyeCount는
// 방문자도 실제 모습을 봐야 하니 포함하지만, "온보딩을 끝냈는지"는 본인만의 정보라 여기 넣지 않는다
// (routes/dodo.ts의 self 전용 라우트에서만 별도로 계산해서 얹는다).
export function toAppearanceResponse(appearance: AppearanceWithItems) {
  return {
    bodyColor: appearance.bodyColor,
    eyeCount: appearance.eyeCount as 1 | 2,
    hat: toSlotResponse(appearance.hatItem, appearance.hatColor),
    glasses: toSlotResponse(appearance.glassesItem, appearance.glassesColor),
    outfit: toSlotResponse(appearance.outfitItem, appearance.outfitColor),
    accessory: toSlotResponse(appearance.accessoryItem, appearance.accessoryColor),
  }
}

// 몸 색상/눈 개수만 다루는 1차 온보딩 — 검증(색상 팔레트 포함 여부, eyeCount 1|2)은 라우트에서 하고
// 여기서는 upsert만 담당한다. onboardedAt은 최초 1회만 기록해(멱등) 재제출해도 온보딩 완료 시점이 안 바뀐다.
export async function updateDodoBaseAppearance(userId: string, patch: { bodyColor: string; eyeCount: 1 | 2 }) {
  const existing = await prisma.dodoAppearance.findUnique({ where: { userId } })
  return prisma.dodoAppearance.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_APPEARANCE, ...patch, onboardedAt: new Date() },
    update: { ...patch, onboardedAt: existing?.onboardedAt ?? new Date() },
    include: APPEARANCE_INCLUDE,
  })
}

export type EquipRoomItemResult =
  | { status: 'ok'; appearance: Awaited<ReturnType<typeof getDodoAppearance>> }
  | { status: 'not_owned' }
  | { status: 'not_equippable' }

export async function equipRoomItem(userId: string, inventoryId: string): Promise<EquipRoomItemResult> {
  const owned = await prisma.userInventory.findFirst({ where: { id: inventoryId, userId }, include: { item: true } })
  if (!owned) return { status: 'not_owned' }
  if (!owned.item.equippable || !owned.item.equipSlot) return { status: 'not_equippable' }

  const appearance = await setSlot(userId, owned.item.equipSlot, owned.itemId, owned.color)
  return { status: 'ok', appearance }
}

export async function unequipRoomItem(userId: string, inventoryId: string): Promise<EquipRoomItemResult> {
  const owned = await prisma.userInventory.findFirst({ where: { id: inventoryId, userId }, include: { item: true } })
  if (!owned || !owned.item.equipSlot) return { status: 'not_owned' }

  const current = await prisma.dodoAppearance.findUnique({ where: { userId } })
  const field = SLOT_FIELD[owned.item.equipSlot]
  // 다른 아이템이 이미 그 슬롯을 차지하고 있거나 애초에 장착 안 된 상태면 이미 해제된 것과 같으니 그대로 조회만 해서 돌려준다.
  if (!current || current[field] !== owned.itemId) {
    return { status: 'ok', appearance: await getDodoAppearance(userId) }
  }

  const appearance = await setSlot(userId, owned.item.equipSlot, null, null)
  return { status: 'ok', appearance }
}
