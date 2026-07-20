/**
 * 룸메이트 매칭용 하드필터 통과 여부를 계산한다.
 * @param {{ gender: string, smokingStatus: string, drinkingStatus: string, roommateType: string }} userA
 * @param {{ gender: string, smokingStatus: string, drinkingStatus: string, roommateType: string }} userB
 * @returns {boolean} 성별, 흡연여부, 음주여부, 룸메이트타입이 모두 일치하면 true
 */
export function passesHardFilter(userA, userB) {
  return (
    userA.gender === userB.gender &&
    userA.smokingStatus === userB.smokingStatus &&
    userA.drinkingStatus === userB.drinkingStatus &&
    userA.roommateType === userB.roommateType
  )
}

/**
 * 두 생활성향 벡터([깔끔루틴러, 함께루틴러, 여유마이웨이, 편한동거러] 순) 간 코사인 유사도를 계산한다.
 * @param {number[]} vectorA
 * @param {number[]} vectorB
 * @returns {number} 0~1 사이의 유사도 (둘 중 하나라도 zero vector면 0)
 */
export function cosineSimilarity(vectorA, vectorB) {
  const dotProduct = vectorA.reduce((sum, value, i) => sum + value * vectorB[i], 0)
  const magnitudeA = Math.sqrt(vectorA.reduce((sum, value) => sum + value * value, 0))
  const magnitudeB = Math.sqrt(vectorB.reduce((sum, value) => sum + value * value, 0))

  if (magnitudeA === 0 || magnitudeB === 0) return 0

  return dotProduct / (magnitudeA * magnitudeB)
}

/**
 * 소프트필터(guestPolicy, temperaturePreference) 일치 개수를 기반으로 매칭 점수를 계산한다.
 * @param {{ guestPolicy: string, temperaturePreference: string }} userA
 * @param {{ guestPolicy: string, temperaturePreference: string }} userB
 * @returns {number} 일치 개수(0, 1, 2)를 2로 나눈 값 (0, 0.5, 1 중 하나)
 */
export function softFilterMatch(userA, userB) {
  let matchCount = 0
  if (userA.guestPolicy === userB.guestPolicy) matchCount += 1
  if (userA.temperaturePreference === userB.temperaturePreference) matchCount += 1

  return matchCount / 2
}

/**
 * 생활성향 유사도와 소프트필터 점수를 가중합해 최종 매칭 점수를 계산한다.
 * @param {number} lifestyleSimilarity 생활성향 코사인 유사도 (0~1)
 * @param {number} softMatch 소프트필터 매칭 점수 (0, 0.5, 1)
 * @returns {number} finalScore = lifestyleSimilarity * 0.6 + softMatch * 0.4
 */
export function calculateFinalScore(lifestyleSimilarity, softMatch) {
  return lifestyleSimilarity * 0.6 + softMatch * 0.4
}
