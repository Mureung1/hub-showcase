import { RESOURCE_TYPE } from '@teamflow/shared'

export const editableResourceTypes = Object.values(RESOURCE_TYPE).filter((type) => type !== RESOURCE_TYPE.FOLDER)

export function isSafeHttpUrl(value) {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateResource(values) {
  if (!values.name.trim()) return '자료 이름을 입력해 주세요.'
  const url = values.url?.trim() ?? ''
  if (values.type === RESOURCE_TYPE.LINK && !url) return '링크 자료에는 URL을 입력해 주세요.'
  if (url && !isSafeHttpUrl(url)) return 'http:// 또는 https://로 시작하는 올바른 URL을 입력해 주세요.'
  return ''
}
