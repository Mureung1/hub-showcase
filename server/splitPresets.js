// 온보딩 — 가능일수에 따른 분할 프리셋 정의 (이슈 #12에서 확정).
// daysPerWeek → splitType, splitType → 요일별 세부부위(Exercise.targetArea) 매핑을 담는다.
// 실제 요일 배정(어느 요일에 어느 day를 놓을지)은 #14에서 정한다 — 여기는 "무엇을" 담당한다.

export const SPLIT_TYPE_BY_DAYS_PER_WEEK = (daysPerWeek) => {
  if (daysPerWeek <= 3) return '전신'
  if (daysPerWeek === 4) return '상하체'
  return 'PPL'
}

// 각 splitType이 실제로 어떤 "day 종류"들로 구성되는지, 그리고 그 day가 어떤 세부부위를 쓰는지.
export const SPLIT_DAY_TYPES = {
  전신: {
    전신: ['등', '어깨', '가슴', '하체', '이두', '삼두', '복합'],
  },
  상하체: {
    상체: ['등', '어깨', '가슴', '이두', '삼두'],
    하체: ['하체'],
  },
  PPL: {
    Push: ['가슴', '어깨', '삼두'],
    Pull: ['등', '이두'],
    Legs: ['하체'],
  },
}
