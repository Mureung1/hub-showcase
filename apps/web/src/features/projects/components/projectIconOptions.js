import { PROJECT_ICON } from '@teamflow/shared'

export const PROJECT_ICON_OPTIONS = Object.freeze([
  { key: PROJECT_ICON.LAYERS, label: '레이어' },
  { key: PROJECT_ICON.ROCKET, label: '로켓' },
  { key: PROJECT_ICON.CODE, label: '코드' },
  { key: PROJECT_ICON.PALETTE, label: '디자인' },
  { key: PROJECT_ICON.MEGAPHONE, label: '홍보' },
  { key: PROJECT_ICON.BOOK, label: '문서' },
])

export function getProjectIconLabel(iconKey) {
  return PROJECT_ICON_OPTIONS.find((option) => option.key === iconKey)?.label ?? '레이어'
}
