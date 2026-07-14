import { FRIDGE_ZONE_SLOTS } from '../data/fridgeStorageZones'

const POP_SCALE = 10
const POP_DURATION_MS = 160
const FLY_DURATION_MS = 650

// 재료 칩을 선택했을 때, 칩 이모지를 하나 복제해서 제자리에서 크게 부풀렸다가(팝)
// 냉장고 그림 속 해당 존의 슬롯 중 하나로 랜덤하게 날아가며 서서히 사라지게 만든다.
// 선택 해제 시에는 호출하지 않는다 — 취소는 모션 없이 즉시 처리 (FridgePage 참고).
export function flyIngredientToFridge({ originEl, fridgeImageEl, emoji, zone }) {
  if (!originEl || !fridgeImageEl) return

  const slots = FRIDGE_ZONE_SLOTS[zone] ?? FRIDGE_ZONE_SLOTS.shelf
  const slot = slots[Math.floor(Math.random() * slots.length)]

  const fromRect = originEl.getBoundingClientRect()
  const imageRect = fridgeImageEl.getBoundingClientRect()
  const fromCenter = { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 }
  const toCenter = {
    x: imageRect.left + (imageRect.width * slot.x) / 100,
    y: imageRect.top + (imageRect.height * slot.y) / 100,
  }
  const dx = toCenter.x - fromCenter.x
  const dy = toCenter.y - fromCenter.y

  const flying = document.createElement('span')
  flying.textContent = emoji
  flying.style.position = 'fixed'
  flying.style.zIndex = '999'
  flying.style.fontSize = '22px'
  flying.style.pointerEvents = 'none'
  flying.style.left = fromCenter.x - 11 + 'px'
  flying.style.top = fromCenter.y - 11 + 'px'
  flying.style.willChange = 'transform, opacity'
  flying.style.transition = `transform ${POP_DURATION_MS}ms ease-out`
  flying.style.transform = 'translate(0, 0) scale(1)'
  flying.style.opacity = '1'
  document.body.appendChild(flying)

  // 1단계: 제자리에서 크게 부풀어 오르는 "팝" 모션
  requestAnimationFrame(() => {
    flying.style.transform = `translate(0, 0) scale(${POP_SCALE})`
  })

  flying.addEventListener('transitionend', function onPop() {
    flying.removeEventListener('transitionend', onPop)
    // 2단계: 커진 크기를 유지한 채 목적지로 날아가면서 서서히 투명해짐(크기는 그대로)
    flying.style.transition = `transform ${FLY_DURATION_MS}ms cubic-bezier(.3, .9, .4, 1), opacity ${FLY_DURATION_MS}ms ease-out`
    requestAnimationFrame(() => {
      flying.style.transform = `translate(${dx}px, ${dy}px) scale(${POP_SCALE}) rotate(20deg)`
      flying.style.opacity = '0'
    })
    flying.addEventListener('transitionend', () => flying.remove())
  })
}
