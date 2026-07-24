// 인증(회원가입/로그인) 붙기 전까지 모든 요청은 이 데모 유저 소유로 취급한다.
export const DEMO_USER_ID = 'demo-user'

// 카테고리 색은 톤 4가지로 고정 — 사용자가 임의 hex를 고르지 않고 톤만 선택한다.
export const TONE_COLORS = {
  blue: '#98bce7',
  coral: '#f2a58d',
  violet: '#b8a6de',
  green: '#8fbdab',
} as const

// 새로 가입한 유저에게 기본으로 만들어주는 카테고리(id는 유저마다 새로 생성됨).
export const DEFAULT_CATEGORY_TEMPLATE = [
  { name: '공부', tone: 'blue', color: TONE_COLORS.blue },
  { name: '운동', tone: 'coral', color: TONE_COLORS.coral },
  { name: '약속', tone: 'violet', color: TONE_COLORS.violet },
  { name: '기타', tone: 'green', color: TONE_COLORS.green },
] as const

export const DEMO_CATEGORIES = [
  { id: 'study', ...DEFAULT_CATEGORY_TEMPLATE[0] },
  { id: 'exercise', ...DEFAULT_CATEGORY_TEMPLATE[1] },
  { id: 'appointment', ...DEFAULT_CATEGORY_TEMPLATE[2] },
  { id: 'personal', ...DEFAULT_CATEGORY_TEMPLATE[3] },
] as const

// 프론트 src/components/scheduler/shared.tsx의 AVATAR_PALETTE와 값이 동일해야 한다(프로필 편집 시 검증용).
export const AVATAR_PALETTE = ['#a9c8ec', '#c7b7e7', '#a9cfbd', '#f2a58d', '#b8a6de', '#8fbdab', '#4a4a4a'] as const

// 핸들은 영문/숫자/언더스코어 3~20자만 허용(프로필 수정, 친구 검색 양쪽에서 재사용).
export const HANDLE_PATTERN = /^[a-zA-Z0-9_]{3,20}$/

// 마이홈 꾸미기 상점의 전역 카탈로그. 유저별이 아니라 전체 공용이라 고정 id로 upsert한다.
// equippable: 두두가 직접 착용(헤드폰) / interactable: 장식용이지만 두두와 상호작용 가능(게임기, 화분) /
// colorCustomizable: 본체 색을 사용자가 AVATAR_PALETTE 중에서 고를 수 있음(게임기) /
// placeable: 마이홈 방 안에 물리적으로 놓을 수 있음(헤드폰은 착용만 하고 놓지 않음) /
// wallMounted: 벽 영역에만 놓을 수 있음(창문·별 장식·선반 장식 — 화분은 방 어디든 자유롭게 놓을 수 있다) /
// equipSlot: equippable이 true인 아이템이 DodoAppearance의 어느 슬롯에 장착되는지(헤드폰은 accessory). equippable이 false면 항상 null /
// repeatable: 색 구분 없이도 같은 아이템을 여러 개 살 수 있음(간식류 — 소비성 아이템이라 개수 제한이 없다).
export const ROOM_ITEMS = [
  { id: 'item-game-console', name: '게임기', cost: 300, type: 'FURNITURE', iconKey: 'game-console', equippable: false, interactable: true, colorCustomizable: true, placeable: true, wallMounted: false, equipSlot: null, repeatable: false },
  { id: 'item-headphones', name: '헤드폰', cost: 300, type: 'FURNITURE', iconKey: 'headphones', equippable: true, interactable: false, colorCustomizable: true, placeable: false, wallMounted: false, equipSlot: 'ACCESSORY', repeatable: false },
  { id: 'item-table', name: '테이블', cost: 350, type: 'FURNITURE', iconKey: 'table', equippable: false, interactable: false, colorCustomizable: true, placeable: true, wallMounted: false, equipSlot: null, repeatable: false },
  { id: 'item-window', name: '창문', cost: 500, type: 'WINDOW_VIEW', iconKey: 'window', equippable: false, interactable: false, colorCustomizable: false, placeable: true, wallMounted: true, equipSlot: null, repeatable: false },
  { id: 'item-plant', name: '화분', cost: 200, type: 'FURNITURE', iconKey: 'plant', equippable: false, interactable: true, colorCustomizable: false, placeable: true, wallMounted: false, equipSlot: null, repeatable: false },
  { id: 'item-wall-star', name: '별 장식', cost: 150, type: 'FURNITURE', iconKey: 'wall-star', equippable: false, interactable: false, colorCustomizable: true, placeable: true, wallMounted: true, equipSlot: null, repeatable: false },
  { id: 'item-wall-shelf', name: '선반 장식', cost: 150, type: 'FURNITURE', iconKey: 'wall-shelf', equippable: false, interactable: false, colorCustomizable: false, placeable: true, wallMounted: true, equipSlot: null, repeatable: false },
  // 간식류 — 구매하면 자동으로 방에 배치된다(테이블이 있으면 그 위, 없으면 바닥). 프론트 useRoomShopManager의 FOOD_ICON_KEYS 참고.
  { id: 'item-fried-egg', name: '계란후라이', cost: 50, type: 'FURNITURE', iconKey: 'fried-egg', equippable: false, interactable: true, colorCustomizable: false, placeable: true, wallMounted: false, equipSlot: null, repeatable: true },
  { id: 'item-toast', name: '토스트', cost: 50, type: 'FURNITURE', iconKey: 'toast', equippable: false, interactable: true, colorCustomizable: false, placeable: true, wallMounted: false, equipSlot: null, repeatable: true },
  { id: 'item-pancake', name: '핫케이크', cost: 50, type: 'FURNITURE', iconKey: 'pancake', equippable: false, interactable: true, colorCustomizable: false, placeable: true, wallMounted: false, equipSlot: null, repeatable: true },
  { id: 'item-rice', name: '밥', cost: 50, type: 'FURNITURE', iconKey: 'rice', equippable: false, interactable: true, colorCustomizable: false, placeable: true, wallMounted: false, equipSlot: null, repeatable: true },
] as const
