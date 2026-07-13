require('dotenv/config')
const { PrismaClient } = require('../generated/prisma')

const prisma = new PrismaClient()

// docs/EXERCISE_RESEARCH.md의 33개 운동을 그대로 옮긴 시드 데이터.
// 새 운동을 추가할 땐 이 파일 말고 EXERCISE_RESEARCH.md에 근거부터 남긴 뒤 옮긴다.
const exercises = [
  // 등
  { name: '바벨 벤트오버 로우', targetArea: '등', involvedJoints: ['어깨', '팔꿈치', '고관절', '허리'] },
  { name: '케이블 시티드 로우', targetArea: '등', involvedJoints: ['어깨', '팔꿈치'] },
  { name: '인버티드 로우', targetArea: '등', involvedJoints: ['어깨', '팔꿈치', '고관절'] },
  { name: '양손 벤트오버 덤벨로우', targetArea: '등', involvedJoints: ['어깨', '팔꿈치', '고관절', '허리'] },
  { name: '원암 덤벨로우(벤치 지지)', targetArea: '등', involvedJoints: ['어깨', '팔꿈치', '고관절', '허리'] },
  { name: '체스트 서포티드 덤벨로우', targetArea: '등', involvedJoints: ['어깨', '팔꿈치'] },
  { name: '풀업/친업', targetArea: '등', involvedJoints: ['어깨', '팔꿈치'] },
  { name: '랫풀다운', targetArea: '등', involvedJoints: ['어깨', '팔꿈치'] },
  { name: '스트레이트암 풀다운/풀오버', targetArea: '등', involvedJoints: ['어깨'] },

  // 어깨
  { name: '오버헤드프레스', targetArea: '어깨', involvedJoints: ['어깨', '팔꿈치'] },
  { name: '푸시프레스', targetArea: '어깨', involvedJoints: ['어깨', '팔꿈치', '고관절', '무릎', '발목'] },
  { name: '페이스풀', targetArea: '어깨', involvedJoints: ['어깨', '팔꿈치'] },
  { name: '랜드마인프레스', targetArea: '어깨', involvedJoints: ['어깨', '팔꿈치'] },
  { name: '레터럴레이즈', targetArea: '어깨', involvedJoints: ['어깨'] },
  { name: '리어델트레이즈/펙덱플라이', targetArea: '어깨', involvedJoints: ['어깨'] },
  { name: '프론트레이즈', targetArea: '어깨', involvedJoints: ['어깨'] },
  { name: '슈러그', targetArea: '어깨', involvedJoints: ['목', '어깨'] },

  // 가슴
  { name: '벤치프레스', targetArea: '가슴', involvedJoints: ['어깨', '팔꿈치'] },
  { name: '딥스/푸시업', targetArea: '가슴', involvedJoints: ['어깨', '팔꿈치'] },
  { name: '체스트플라이/케이블크로스오버', targetArea: '가슴', involvedJoints: ['어깨'] },

  // 하체
  { name: '스쿼트', targetArea: '하체', involvedJoints: ['무릎', '고관절', '발목'] },
  { name: '데드리프트', targetArea: '하체', involvedJoints: ['고관절', '무릎', '발목', '허리'] },
  { name: '루마니안 데드리프트', targetArea: '하체', involvedJoints: ['고관절', '허리'] },
  { name: '런지', targetArea: '하체', involvedJoints: ['고관절', '무릎', '발목'] },
  { name: '레그프레스', targetArea: '하체', involvedJoints: ['무릎', '고관절', '발목'] },
  { name: '레그 익스텐션', targetArea: '하체', involvedJoints: ['무릎'] },
  { name: '레그 컬', targetArea: '하체', involvedJoints: ['무릎'] },
  { name: '카프레이즈', targetArea: '하체', involvedJoints: ['발목'] },
  { name: '힙쓰러스트/글루트브릿지', targetArea: '하체', involvedJoints: ['고관절', '무릎'] },
  { name: '힙 어브덕션/어덕션', targetArea: '하체', involvedJoints: ['고관절'] },

  // 팔
  { name: '바이셉컬', targetArea: '팔', involvedJoints: ['팔꿈치'] },
  { name: '트라이셉 익스텐션', targetArea: '팔', involvedJoints: ['팔꿈치'] },

  // 복합
  { name: '파머스워크', targetArea: '복합', involvedJoints: ['허리', '고관절', '무릎', '발목', '어깨'] },
]

async function main() {
  await prisma.exercise.createMany({ data: exercises })
  console.log(`시드 완료: ${exercises.length}개 운동 삽입`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
