import { describe, test, expect } from 'vitest'
import { matchUserToPosting } from './matchingService'

describe('matchUserToPosting', () => {
  // 정상 케이스: 모든 조건이 일치하는 경우
  test('모든 조건이 일치하면 score는 100이다', () => {
    const user = {
      major: 'CS',
      grade: 3,
      residenceRegion: '서울',
      enrollmentStatus: '재학',
      age: 22,
      incomeBracket: 4,
    }
    const eligibility = {
      majors: ['CS', 'EE'],
      grades: [3, 4],
      regions: ['서울', '경기'],
      enrollmentStatuses: ['재학'],
      ageMin: 20,
      ageMax: 25,
      incomeMax: 5,
    }

    const result = matchUserToPosting(user, eligibility)

    expect(result.isEligible).toBe(true)
    expect(result.score).toBe(100)
    expect(result.matchedCount).toBe(6)
    expect(result.totalCriteria).toBe(6)
  })

  // 정상 케이스: 일부만 일치하는 경우
  test('4개 중 2개만 일치하면 score는 50이다', () => {
    const user = {
      major: 'CS',
      grade: 3,
      residenceRegion: '부산',
      enrollmentStatus: '휴학',
    }
    const eligibility = {
      majors: ['CS', 'EE'],
      grades: [3, 4],
      regions: ['서울', '경기'],
      enrollmentStatuses: ['재학'],
      ageMin: undefined,
      ageMax: undefined,
      incomeMax: undefined,
    }

    const result = matchUserToPosting(user, eligibility)

    expect(result.isEligible).toBe(false)
    expect(result.score).toBe(50)
    expect(result.matchedCount).toBe(2)
    expect(result.totalCriteria).toBe(4)
  })

  // 정상 케이스: 아무것도 일치하지 않는 경우
  test('모든 조건이 일치하지 않으면 score는 0이다', () => {
    const user = {
      major: '물리학',
      grade: 1,
      residenceRegion: '제주',
      enrollmentStatus: '졸업',
    }
    const eligibility = {
      majors: ['CS', 'EE'],
      grades: [3, 4],
      regions: ['서울', '경기'],
      enrollmentStatuses: ['재학'],
      ageMin: undefined,
      ageMax: undefined,
      incomeMax: undefined,
    }

    const result = matchUserToPosting(user, eligibility)

    expect(result.isEligible).toBe(false)
    expect(result.score).toBe(0)
    expect(result.matchedCount).toBe(0)
    expect(result.totalCriteria).toBe(4)
  })

  // 경계값: 조건이 없는 공고
  test('조건이 전혀 없으면 isEligible은 true, score는 100이다', () => {
    const user = {
      major: 'CS',
      grade: 3,
    }
    const eligibility = {
      majors: [],
      grades: [],
      regions: [],
      enrollmentStatuses: [],
      ageMin: undefined,
      ageMax: undefined,
      incomeMax: undefined,
    }

    const result = matchUserToPosting(user, eligibility)

    expect(result.isEligible).toBe(true)
    expect(result.score).toBe(100)
    expect(result.totalCriteria).toBe(0)
  })

  // 경계값: 사용자 데이터가 null인 경우
  test('사용자가 데이터를 가지지 않으면 모두 불일치한다', () => {
    const user = {
      major: null,
      grade: null,
      residenceRegion: null,
      enrollmentStatus: null,
    }
    const eligibility = {
      majors: ['CS'],
      grades: [3],
      regions: ['서울'],
      enrollmentStatuses: ['재학'],
      ageMin: undefined,
      ageMax: undefined,
      incomeMax: undefined,
    }

    const result = matchUserToPosting(user, eligibility)

    expect(result.isEligible).toBe(false)
    expect(result.score).toBe(0)
  })

  // 실패 케이스: 나이 범위 (최소값)
  test('나이가 최소값보다 작으면 불일치한다', () => {
    const user = {
      age: 19,
    }
    const eligibility = {
      majors: [],
      grades: [],
      regions: [],
      enrollmentStatuses: [],
      ageMin: 20,
      ageMax: 25,
      incomeMax: undefined,
    }

    const result = matchUserToPosting(user, eligibility)

    expect(result.isEligible).toBe(false)
    expect(result.score).toBe(0)
  })

  // 실패 케이스: 나이 범위 (최대값)
  test('나이가 최대값보다 크면 불일치한다', () => {
    const user = {
      age: 26,
    }
    const eligibility = {
      majors: [],
      grades: [],
      regions: [],
      enrollmentStatuses: [],
      ageMin: 20,
      ageMax: 25,
      incomeMax: undefined,
    }

    const result = matchUserToPosting(user, eligibility)

    expect(result.isEligible).toBe(false)
    expect(result.score).toBe(0)
  })

  // 실패 케이스: 나이 범위 (경계값 통과)
  test('나이가 정확히 범위 내에 있으면 일치한다', () => {
    const user = {
      age: 20,
    }
    const eligibility = {
      majors: [],
      grades: [],
      regions: [],
      enrollmentStatuses: [],
      ageMin: 20,
      ageMax: 25,
      incomeMax: undefined,
    }

    const result = matchUserToPosting(user, eligibility)

    expect(result.isEligible).toBe(true)
    expect(result.score).toBe(100)
  })

  // 실패 케이스: 소득 체크
  test('소득이 제한값을 초과하면 불일치한다', () => {
    const user = {
      incomeBracket: 6,
    }
    const eligibility = {
      majors: [],
      grades: [],
      regions: [],
      enrollmentStatuses: [],
      ageMin: undefined,
      ageMax: undefined,
      incomeMax: 5,
    }

    const result = matchUserToPosting(user, eligibility)

    expect(result.isEligible).toBe(false)
    expect(result.score).toBe(0)
  })

  // 실패 케이스: 소득 체크 (경계값)
  test('소득이 정확히 제한값이면 일치한다', () => {
    const user = {
      incomeBracket: 5,
    }
    const eligibility = {
      majors: [],
      grades: [],
      regions: [],
      enrollmentStatuses: [],
      ageMin: undefined,
      ageMax: undefined,
      incomeMax: 5,
    }

    const result = matchUserToPosting(user, eligibility)

    expect(result.isEligible).toBe(true)
    expect(result.score).toBe(100)
  })
})
