// 리텐션 강화 v4 — 오늘의 퀴즈 선택/보기 순서 결정. 서버 왕복이 필요했던 예전 calorieQuiz.js(계산
// 기반)와 달리 nutritionTriviaPool.js가 전부 정적 데이터라 완전히 클라이언트에서, 동기적으로 끝난다
// (fetch 없음 — QuizCard.jsx의 "시작" 버튼을 눌러도 로딩 스피너가 필요 없는 이유). 같은
// (userId, dateKey)면 항상 같은 문제·같은 보기 순서가 나온다(quests.js의 로테이션 선택과 동일한
// hashString 기반 결정성).
import { hashString } from './hashString.js'

function shuffleChoices(choices, correctIndex, seed) {
  const correctChoice = choices[correctIndex]
  const shuffled = choices
    .map((choice, i) => ({ choice, key: hashString(`${seed}:shuffle:${i}:${choice}`) }))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.choice)
  return { choices: shuffled, correctIndex: shuffled.indexOf(correctChoice) }
}

// pool: nutritionTriviaPool.js의 NUTRITION_TRIVIA_POOL(또는 테스트용 동일 모양의 배열).
// 반환: { id, question, category, choices, correctIndex } | null(풀이 비어 있으면).
export function pickTodayTrivia(pool, userId, dateKey) {
  if (!pool || pool.length === 0) return null
  const index = hashString(`${userId}:${dateKey}:trivia`) % pool.length
  const trivia = pool[index]
  // 매일 정답 위치가 바뀌도록 문항 id까지 시드에 섞는다 — 그러지 않으면 correctIndex가 항상 0인
  // 원본 데이터 그대로 노출돼("정답은 항상 첫 번째") 패턴을 외워버릴 수 있다.
  const { choices, correctIndex } = shuffleChoices(trivia.choices, trivia.correctIndex, `${userId}:${dateKey}:${trivia.id}`)
  return { id: trivia.id, question: trivia.question, category: trivia.category, choices, correctIndex }
}
