const SERVICE_COLOR_PALETTE = [
  '#6FA8DC', // 하늘
  '#B8A6E0', // 라벤더
  '#F2A488', // 코럴
  '#E8C468', // 머스터드
  '#E896B0', // 로즈
  '#5FC7C0', // 틸
  '#A97CA5', // 플럼
  '#C9B38C', // 샌드
]

export function getServiceColor(serviceName) {
  let hash = 0
  for (let i = 0; i < serviceName.length; i++) {
    hash = (hash * 31 + serviceName.charCodeAt(i)) | 0
  }

  const index = Math.abs(hash) % SERVICE_COLOR_PALETTE.length
  return SERVICE_COLOR_PALETTE[index]
}
