import 'dotenv/config'
import { prisma } from '../db.js'

// wger.de(CC-BY-SA)에서 사람이 직접 검색해 고른 매칭 결과다 — wger API의 이름 검색 엔드포인트가
// 지금 버전에 없어서(404) 자동 매칭이 아니라, 후보 이미지를 눈으로 확인하고 고른 값을 여기 적어둔다.
// 새 운동을 추가로 매칭할 땐 이 배열에 행을 추가하고 다시 실행하면 된다(멱등 — 몇 번 돌려도 안전).
const MATCHES = [
  {
    name: '벤치프레스',
    wgerExerciseId: 73,
    imageUrl: 'https://wger.de/media/exercise-images/192/Bench-press-1.png',
    localFile: 'exercise-18.png',
    licenseAuthor: 'Everkinetic',
  },
  {
    name: '스쿼트',
    wgerExerciseId: 1801,
    imageUrl:
      'https://wger.de/media/exercise-images/1801/60043328-1cfb-4289-9865-aaf64d5aaa28.jpg',
    localFile: 'exercise-21.webp',
    licenseAuthor: 'Workout Guru',
  },
  {
    name: '바벨 벤트오버 로우',
    wgerExerciseId: 83,
    imageUrl:
      'https://wger.de/media/exercise-images/109/Barbell-rear-delt-row-1.png',
    localFile: 'exercise-1.png',
    licenseAuthor: 'Everkinetic',
  },
  {
    name: '오버헤드프레스',
    wgerExerciseId: 566,
    imageUrl:
      'https://wger.de/media/exercise-images/119/seated-barbell-shoulder-press-large-1.png',
    localFile: 'exercise-10.png',
    licenseAuthor: 'Everkinetic',
  },
  {
    name: '바이셉컬',
    wgerExerciseId: 91,
    imageUrl: 'https://wger.de/media/exercise-images/74/Bicep-curls-1.png',
    localFile: 'exercise-31.png',
    licenseAuthor: 'Everkinetic',
  },
  {
    name: '케이블 시티드 로우',
    wgerExerciseId: 1117,
    imageUrl:
      'https://wger.de/media/exercise-images/1117/2555c4c3-a84d-47db-b83b-cbf721f12e45.png',
    localFile: 'exercise-2.jpg',
    licenseAuthor: 'Franpol',
  },
  {
    name: '인버티드 로우',
    wgerExerciseId: 1198,
    imageUrl:
      'https://wger.de/media/exercise-images/1198/864906ac-4ac7-4e52-a886-c6bb97950a9f.jpg',
    localFile: 'exercise-3.jpg',
    licenseAuthor: 'Gavru',
  },
  {
    name: '양손 벤트오버 덤벨로우',
    wgerExerciseId: 81,
    imageUrl:
      'https://wger.de/media/exercise-images/81/a751a438-ae2d-4751-8d61-cef0e9292174.png',
    localFile: 'exercise-4.jpg',
    licenseAuthor: 'Franpol',
  },
  {
    name: '체스트 서포티드 덤벨로우',
    wgerExerciseId: 1283,
    imageUrl:
      'https://wger.de/media/exercise-images/1283/e7262f70-7512-408a-8d00-4c499ef632fc.jpg',
    localFile: 'exercise-6.jpg',
    licenseAuthor: 'carlos3c',
  },
  {
    name: '풀업/친업',
    wgerExerciseId: 152,
    imageUrl:
      'https://wger.de/media/exercise-images/152/6c1a7459-266d-491a-bd50-7cbaea2bc771.png',
    localFile: 'exercise-7.png',
    licenseAuthor: 'Everkinetic',
  },
  {
    name: '랫풀다운',
    wgerExerciseId: 1127,
    imageUrl:
      'https://wger.de/media/exercise-images/1127/4942b7c0-6bda-4983-88e5-86547c3d445e.png',
    localFile: 'exercise-8.jpg',
    licenseAuthor: 'Franpol',
  },
  {
    name: '스트레이트암 풀다운/풀오버',
    wgerExerciseId: 1137,
    imageUrl:
      'https://wger.de/media/exercise-images/1137/42f22229-c0a0-4bfc-aca6-66fe5e1ab10d.PNG',
    localFile: 'exercise-9.jpg',
    licenseAuthor: 'Franpol',
  },
  {
    name: '푸시프레스',
    wgerExerciseId: 478,
    imageUrl:
      'https://wger.de/media/exercise-images/478/70a2d72c-a822-45f3-8de2-54ea85951b84.jpg',
    localFile: 'exercise-11.jpg',
    licenseAuthor: 'philip',
  },
  {
    name: '페이스풀',
    wgerExerciseId: 1732,
    imageUrl:
      'https://wger.de/media/exercise-images/1732/d13b9adb-968e-4f73-95e6-b16690bcf616.jpg',
    localFile: 'exercise-12.jpg',
    licenseAuthor: '54str',
  },
  {
    name: '레터럴레이즈',
    wgerExerciseId: 348,
    imageUrl:
      'https://wger.de/media/exercise-images/148/lateral-dumbbell-raises-large-2.png',
    localFile: 'exercise-14.png',
    licenseAuthor: 'Everkinetic',
  },
  {
    name: '리어델트레이즈/펙덱플라이',
    wgerExerciseId: 487,
    imageUrl:
      'https://wger.de/media/exercise-images/487/ad724e5c-b1ed-49e8-9279-a17545b0dd0b.png',
    localFile: 'exercise-15.png',
    licenseAuthor: 'cshep442',
  },
  {
    name: '프론트레이즈',
    wgerExerciseId: 256,
    imageUrl:
      'https://wger.de/media/exercise-images/256/b7def5bc-2352-499b-b9e5-fff741003831.png',
    localFile: 'exercise-16.png',
    licenseAuthor: 'philip',
  },
  {
    name: '슈러그',
    wgerExerciseId: 570,
    imageUrl:
      'https://wger.de/media/exercise-images/570/68b4a33f-40f1-4dda-b56c-a2e20ed13903.jpg',
    localFile: 'exercise-17.png',
    licenseAuthor: null,
  },
  {
    name: '딥스/푸시업',
    wgerExerciseId: 194,
    imageUrl:
      'https://wger.de/media/exercise-images/194/34600351-8b0b-4cb0-8daa-583537be15b0.png',
    localFile: 'exercise-19.png',
    licenseAuthor: 'cshep442',
  },
  {
    name: '체스트플라이/케이블크로스오버',
    wgerExerciseId: 926,
    imageUrl:
      'https://wger.de/media/exercise-images/926/ae9deb5d-a1e9-4c30-b1e3-c128ba5d4969.png',
    localFile: 'exercise-20.png',
    licenseAuthor: null,
  },
  {
    name: '데드리프트',
    wgerExerciseId: 184,
    imageUrl:
      'https://wger.de/media/exercise-images/184/1709c405-620a-4d07-9658-fade2b66a2df.jpeg',
    localFile: 'exercise-22.jpeg',
    licenseAuthor: 'philip',
  },
  {
    name: '루마니안 데드리프트',
    wgerExerciseId: 1652,
    imageUrl:
      'https://wger.de/media/exercise-images/1652/0306c8c0-70cc-45d4-92de-6fa72ceaa834.webp',
    localFile: 'exercise-23.webp',
    licenseAuthor: 'AlucardEvil40',
  },
  {
    name: '런지',
    wgerExerciseId: 984,
    imageUrl:
      'https://wger.de/media/exercise-images/984/5c7ffe68-e7b2-47f3-a22a-f9cc28640432.png',
    localFile: 'exercise-24.jpg',
    licenseAuthor: 'Franpol',
  },
  {
    name: '레그프레스',
    wgerExerciseId: 371,
    imageUrl:
      'https://wger.de/media/exercise-images/371/d2136f96-3a43-4d4c-9944-1919c4ca1ce1.webp',
    localFile: 'exercise-25.webp',
    licenseAuthor: null,
  },
  {
    name: '레그 익스텐션',
    wgerExerciseId: 369,
    imageUrl:
      'https://wger.de/media/exercise-images/369/78c915d1-e46d-4d30-8124-65d68664c3ef.png',
    localFile: 'exercise-26.jpg',
    licenseAuthor: 'Franpol',
  },
  {
    name: '레그 컬',
    wgerExerciseId: 364,
    imageUrl:
      'https://wger.de/media/exercise-images/364/b318dde9-f5f2-489f-940a-cd864affb9e3.png',
    localFile: 'exercise-27.png',
    licenseAuthor: 'Franpol',
  },
  {
    name: '카프레이즈',
    wgerExerciseId: 622,
    imageUrl:
      'https://wger.de/media/exercise-images/622/9a429bd0-afd3-4ad0-8043-e9beec901c81.jpeg',
    localFile: 'exercise-28.jpeg',
    licenseAuthor: 'clafal',
  },
  {
    name: '힙쓰러스트/글루트브릿지',
    wgerExerciseId: 1642,
    imageUrl:
      'https://wger.de/media/exercise-images/1642/a81ad922-caf5-47f8-99b4-640cb0717436.webp',
    localFile: 'exercise-29.webp',
    licenseAuthor: 'AlucardEvil40',
  },
  {
    name: '힙 어브덕션/어덕션',
    wgerExerciseId: 1748,
    imageUrl:
      'https://wger.de/media/exercise-images/1748/923a3ff7-c269-49bd-9f03-697151a40f06.jpg',
    localFile: 'exercise-30.jpg',
    licenseAuthor: null,
  },
  {
    name: '트라이셉 익스텐션',
    wgerExerciseId: 50,
    imageUrl:
      'https://wger.de/media/exercise-images/50/695ced5c-9961-4076-add2-cb250d01089e.png',
    localFile: 'exercise-32.png',
    licenseAuthor: 'Franpol',
  },
]

// 검색해도 이미지가 없거나(원암 덤벨로우 계열, 랜드마인프레스, 파머스워크) wger에
// 적당한 매칭이 없던 3개는 이번 라운드에서 건너뛴다 — 텍스트 문구만 그대로 유지된다.

// 이미지 파일 자체는 이 스크립트를 실행하기 전에 client/public/exercise-images/에
// 미리 받아둔 상태여야 한다(다운로드는 이 스크립트가 하지 않는다 — DB 갱신만 담당).
for (const m of MATCHES) {
  const exercise = await prisma.exercise.findFirst({ where: { name: m.name } })
  if (!exercise) {
    console.log(`건너뜀: "${m.name}"을 Exercise 테이블에서 못 찾음`)
    continue
  }
  await prisma.exercise.update({
    where: { id: exercise.id },
    data: {
      imagePath: `/exercise-images/${m.localFile}`,
      imageLicenseAuthor: m.licenseAuthor,
      imageSourceUrl: `https://wger.de/en/exercise/${m.wgerExerciseId}/view/`,
    },
  })
  console.log(
    `갱신됨: ${m.name} (id=${exercise.id}) -> /exercise-images/${m.localFile}`,
  )
}

await prisma.$disconnect()
