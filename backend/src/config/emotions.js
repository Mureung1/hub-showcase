// AI 매칭에서 쓰는 감정 어휘와 인접 관계표.
// 감정 태그는 이 목록 안에서만 고르게 하고, 매칭 시 "같은 감정(Tier1)"과
// "인접 감정(Tier2)"을 구분하는 기준으로 쓴다.
//
// 2026-07-27 업데이트: 원래 16개(부정 14개+긍정 2개)가 부정 감정에 크게 치우쳐 있어서
// 긍정 감정 4개(기쁨/감사/설렘/자부심)를 추가했다. 답답함은 실제 편지에서 Gemini가
// 반복해서 고르려다 목록에 없어서 태깅이 실패했던 사례라 같이 추가함.
//
// 아래 21개는 사람이 큐레이션한 "기본" 목록이다. 이후로는 태깅이 실패할 때마다(Gemini가
// 이 목록 밖의 단어를 골랐을 때만) taggingService가 dynamicEmotions.json에 새 단어와
// 인접 관계를 자동으로 추가하고, 여기서 그걸 병합해 목록을 늘려간다.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DYNAMIC_EMOTIONS_PATH = path.join(__dirname, 'dynamicEmotions.json')

const BASE_EMOTIONS = [
  '불안', '막막함', '외로움', '그리움', '슬픔', '후회',
  '죄책감', '분노', '억울함', '무력감', '지침', '두려움',
  '부담감', '서운함', '안도', '희망',
  '기쁨', '감사', '설렘', '자부심', '답답함',
]

// 인접 관계는 한쪽 방향만 적어두고, 아래에서 반대 방향 엣지를 자동으로 채운다
// (표를 고칠 때 대칭을 손으로 안 맞춰도 되게).
const ADJACENCY_SOURCE = {
  불안: ['막막함', '두려움', '부담감'],
  막막함: ['불안', '무력감', '지침', '답답함'],
  외로움: ['그리움', '슬픔', '서운함'],
  그리움: ['외로움', '슬픔'],
  슬픔: ['외로움', '그리움', '후회'],
  후회: ['죄책감', '슬픔'],
  죄책감: ['후회', '무력감'],
  분노: ['억울함', '서운함'],
  억울함: ['분노', '서운함', '답답함'],
  무력감: ['막막함', '지침', '죄책감', '답답함'],
  지침: ['무력감', '막막함', '부담감'],
  두려움: ['불안', '부담감'],
  부담감: ['불안', '지침', '두려움'],
  서운함: ['외로움', '억울함', '분노'],
  답답함: ['막막함', '억울함', '무력감'],
  안도: ['희망', '기쁨', '감사', '자부심'],
  희망: ['안도', '설렘', '기쁨'],
  기쁨: ['안도', '희망', '감사', '자부심', '설렘'],
  감사: ['기쁨', '안도'],
  설렘: ['희망', '기쁨'],
  자부심: ['기쁨', '안도'],
}

function buildSymmetricAdjacency(emotions, source) {
  const map = new Map(emotions.map((emotion) => [emotion, new Set()]))

  for (const [emotion, neighbors] of Object.entries(source)) {
    for (const neighbor of neighbors) {
      map.get(emotion).add(neighbor)
      map.get(neighbor).add(emotion)
    }
  }

  const plain = {}
  for (const [emotion, neighbors] of map.entries()) {
    plain[emotion] = [...neighbors]
  }
  return plain
}

// EMOTIONS/EMOTION_ADJACENCY는 const로 export하지만 재할당하지 않고 내부 값만 바꾼다.
// 이래야 이미 이 값들을 import한 candidateFinder 등에서도 같은 참조를 보고 있어서
// 나중에 늘어난 감정이 별도 조치 없이 바로 반영된다.
export const EMOTIONS = [...BASE_EMOTIONS]
export const EMOTION_ADJACENCY = buildSymmetricAdjacency(BASE_EMOTIONS, ADJACENCY_SOURCE)

function loadDynamicEmotions() {
  try {
    return JSON.parse(fs.readFileSync(DYNAMIC_EMOTIONS_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

// 감정 하나를 목록/인접표에 병합한다(메모리에만 반영, 파일 저장은 addDynamicEmotion에서 별도로 함).
function mergeEmotion(emotion, adjacentTo) {
  if (!EMOTIONS.includes(emotion)) EMOTIONS.push(emotion)
  if (!EMOTION_ADJACENCY[emotion]) EMOTION_ADJACENCY[emotion] = []

  for (const neighbor of adjacentTo) {
    if (!EMOTION_ADJACENCY[neighbor]) continue // 존재하지 않는 감정과는 연결하지 않음
    if (!EMOTION_ADJACENCY[emotion].includes(neighbor)) EMOTION_ADJACENCY[emotion].push(neighbor)
    if (!EMOTION_ADJACENCY[neighbor].includes(emotion)) EMOTION_ADJACENCY[neighbor].push(emotion)
  }
}

// 서버 시작 시 지금까지 학습된 감정을 병합해둔다.
for (const [emotion, adjacentTo] of Object.entries(loadDynamicEmotions())) {
  mergeEmotion(emotion, adjacentTo)
}

// Gemini가 목록 밖의 감정 단어를 골라 태깅이 실패했을 때만 taggingService가 호출한다.
// 그 외 경로(예: 성공한 태깅 결과)에서 새 감정을 추가하는 일은 없다.
export function addDynamicEmotion(emotion, adjacentTo = []) {
  if (EMOTIONS.includes(emotion)) return // 이미 있는 감정이면 아무것도 하지 않음(중복 저장 방지)

  mergeEmotion(emotion, adjacentTo)

  const current = loadDynamicEmotions()
  current[emotion] = adjacentTo
  fs.writeFileSync(DYNAMIC_EMOTIONS_PATH, `${JSON.stringify(current, null, 2)}\n`)
}

export function isValidEmotion(emotion) {
  return EMOTIONS.includes(emotion)
}

export function areAdjacent(a, b) {
  return EMOTION_ADJACENCY[a]?.includes(b) ?? false
}
