// 사용자와 공고 매칭 알고리즘

interface UserProfile {
  major?: string | null
  grade?: number | null
  enrollmentStatus?: string | null
  residenceRegion?: string | null
  incomeBracket?: number | null
  age?: number | null
}

interface Eligibility {
  majors: string[]
  regions: string[]
  grades: number[]
  enrollmentStatuses: string[]
  ageMin?: number | null
  ageMax?: number | null
  incomeMax?: number | null
}

interface MatchScore {
  isEligible: boolean
  matchedCount: number
  totalCriteria: number
  score: number
}

export function matchUserToPosting(
  user: UserProfile,
  eligibility: Eligibility
): MatchScore {
  let matchedCount = 0
  let totalCriteria = 0

  // 1. 전공 체크
  if (eligibility.majors.length > 0) {
    totalCriteria++
    if (user.major && eligibility.majors.includes(user.major)) {
      matchedCount++
    }
  }

  // 2. 학년 체크
  if (eligibility.grades.length > 0) {
    totalCriteria++
    if (user.grade && eligibility.grades.includes(user.grade)) {
      matchedCount++
    }
  }

  // 3. 거주지 체크
  if (eligibility.regions.length > 0) {
    totalCriteria++
    if (user.residenceRegion && eligibility.regions.includes(user.residenceRegion)) {
      matchedCount++
    }
  }

  // 4. 재학상태 체크
  if (eligibility.enrollmentStatuses.length > 0) {
    totalCriteria++
    if (user.enrollmentStatus && eligibility.enrollmentStatuses.includes(user.enrollmentStatus)) {
      matchedCount++
    }
  }

  // 5. 나이 체크
  if (eligibility.ageMin !== null && eligibility.ageMin !== undefined || eligibility.ageMax !== null && eligibility.ageMax !== undefined) {
    totalCriteria++
    if (user.age) {
      const minOk = !eligibility.ageMin || user.age >= eligibility.ageMin
      const maxOk = !eligibility.ageMax || user.age <= eligibility.ageMax
      if (minOk && maxOk) {
        matchedCount++
      }
    }
  }

  // 6. 소득 체크
  if (eligibility.incomeMax !== null && eligibility.incomeMax !== undefined) {
    totalCriteria++
    if (user.incomeBracket && user.incomeBracket <= eligibility.incomeMax) {
      matchedCount++
    }
  }

  // 적격 판정: 조건이 있으면 모두 만족해야 함
  const isEligible = totalCriteria === 0 || matchedCount === totalCriteria
  const score = totalCriteria === 0 ? 100 : (matchedCount / totalCriteria) * 100

  return {
    isEligible,
    matchedCount,
    totalCriteria,
    score,
  }
}

// 무관(모든 조건 없음)한 공고 체크
export function isPostingUnrestricted(eligibility: Eligibility): boolean {
  return (
    eligibility.majors.length === 0 &&
    eligibility.regions.length === 0 &&
    eligibility.grades.length === 0 &&
    eligibility.enrollmentStatuses.length === 0 &&
    eligibility.ageMin === null &&
    eligibility.ageMax === null &&
    eligibility.incomeMax === null
  )
}
