// 알레르기·기저질환 다중 선택 옵션 정의 + 저장된 태그(옵션 key 또는 사용자가 직접 입력한 자유
// 텍스트가 섞인 배열)를 사람이 읽을 한글 라벨 목록으로 바꾸는 헬퍼. Profile.jsx(선택 UI)와
// Result.jsx(AI 추천 프롬프트)가 같은 옵션 정의를 공유해야 라벨이 어긋나지 않아 여기 하나로 뺐다.
export const ALLERGY_OPTIONS = [
  { key: 'egg', label: '계란' },
  { key: 'milk', label: '우유' },
  { key: 'peanut', label: '땅콩' },
  { key: 'shellfish', label: '갑각류' },
  { key: 'buckwheat', label: '메밀' },
  { key: 'soy', label: '대두' },
  { key: 'wheat', label: '밀' },
]

export const CONDITION_OPTIONS = [
  { key: 'diabetes', label: '당뇨' },
  { key: 'hypertension', label: '고혈압' },
  { key: 'kidney', label: '신장질환' },
  { key: 'hyperlipidemia', label: '고지혈증' },
]

// tags: string[](옵션 key 또는 자유 입력 텍스트 혼합) -> 한글 라벨 배열. 옵션 key는 정의된 라벨로
// 바꾸고, 그 외(자유 입력)는 이미 사용자가 쓴 한글 텍스트이므로 그대로 둔다.
export function labelizeTags(tags, options) {
  const labelByKey = Object.fromEntries(options.map((o) => [o.key, o.label]))
  return (tags || []).map((tag) => labelByKey[tag] ?? tag)
}
