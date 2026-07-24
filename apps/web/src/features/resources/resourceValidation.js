import { RESOURCE_TYPE, RESOURCE_UPLOAD } from '@teamflow/shared'

export const editableResourceTypes = Object.values(RESOURCE_TYPE).filter((type) => type !== RESOURCE_TYPE.FOLDER)

const MAX_FILE_SIZE_LABEL = `${RESOURCE_UPLOAD.MAX_BYTES / 1024 / 1024}MB`

export function isSafeHttpUrl(value) {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateUploadFile(file) {
  if (!file) return '업로드할 파일을 선택해 주세요.'
  if (file.size <= 0 || file.size > RESOURCE_UPLOAD.MAX_BYTES) {
    return `파일은 1바이트 이상 ${MAX_FILE_SIZE_LABEL} 이하여야 합니다.`
  }
  return ''
}

export function validateResource(values) {
  if (!values.name.trim()) return '자료 이름을 입력해 주세요.'
  const url = values.url?.trim() ?? ''
  if (values.type === RESOURCE_TYPE.LINK && !url) return '링크 자료에는 URL을 입력해 주세요.'
  if (url && !isSafeHttpUrl(url)) return 'http:// 또는 https://로 시작하는 올바른 URL을 입력해 주세요.'
  return ''
}
