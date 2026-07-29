// 같은 화면 안의 목차 이동. (훅이 아니라 도우미다 — `apiFetch.js` 와 같은 자리에 둔다.)
//
// 목차 링크는 `href="#..."` 를 그대로 둔다. 키보드 포커스와 새 탭 열기가 그 속성으로
// 동작하기 때문이다. 다만 기본 동작을 그대로 두면 클릭마다 브라우저 히스토리에 항목이
// 하나씩 쌓여, 다음 화면에서 뒤로가기를 누를 때 화면이 아니라 이전 화면의 목차 위치로만
// 돌아간다. 그래서 클릭을 가로채 직접 스크롤하고 해시는 `replaceState` 로 갈아 끼운다.
//
// `replaceState` 는 hashchange 를 일으키지 않으므로 `useScrollSpy` 가 다시 계산하지 않는다.
// 스크롤이 실제로 움직일 때만 스파이가 반응해 목차 강조가 깜빡이지 않는다.
//
// 화면 상태(`{ screen, job, scope }`)는 `window.history.state` 에 그대로 실어 보낸다.
// 여기서 상태를 비우면 뒤로가기가 복원할 것을 잃는다.

/**
 * 섹션으로 부드럽게 스크롤하고 주소의 해시만 바꾼다.
 * 그 id 가 화면에 없으면 아무것도 하지 않고 false 를 돌려준다.
 */
export function scrollToSection(id) {
  const el = document.getElementById(id)
  if (!el) return false
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  window.history.replaceState(window.history.state, '', `#${id}`)
  return true
}

/**
 * 목차·본문 앵커 클릭 처리. 이벤트와 대상 섹션 id 를 받는다.
 *
 * 새 탭·새 창으로 여는 조작(⌘·Ctrl·Shift·가운데 버튼)은 가로채지 않는다.
 * 대상이 없으면 기본 동작(해시 이동)에 맡긴다.
 */
export function jumpToSection(event, id) {
  if (event.defaultPrevented) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  if (scrollToSection(id)) event.preventDefault()
}
