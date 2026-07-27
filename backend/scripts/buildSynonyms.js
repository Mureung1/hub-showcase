// keywords_raw 빈도를 집계해서 synonyms.json에 채워 넣을 후보를 보여주는 운영 스크립트.
// 읽기 전용 — DB에 아무것도 쓰지 않는다. synonyms.json 편집은 운영자가 결과를 보고 손으로 한다.
// 실행: node scripts/buildSynonyms.js (backend 디렉터리에서)
import 'dotenv/config'
import { prisma } from '../src/lib/prisma.js'

async function main() {
  const letters = await prisma.letter.findMany({
    where: { taggingStatus: 'done' },
    select: { keywordsRaw: true },
  })

  const counts = new Map()
  for (const { keywordsRaw } of letters) {
    for (const keyword of keywordsRaw) {
      counts.set(keyword, (counts.get(keyword) || 0) + 1)
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])

  console.log('편지 수(태깅 완료):', letters.length)
  console.log('고유 키워드 수:', sorted.length)
  console.log('--- 빈도 상위 30개 (synonyms.json 후보) ---')
  for (const [keyword, count] of sorted.slice(0, 30)) {
    console.log(`${count}\t${keyword}`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
