import 'dotenv/config'
import { prisma } from '../src/config/prisma'

// 인천광역시가 2026-07-01부로 행정구역을 개편(2군 8구 → 2군 9구)하면서 옛 "동구"는 "중구"와 통합돼
// "제물포구"가 됐다(원도심 지역 통합, 청사는 신포동 중구청사·송림동 동구청사 병행 사용) — 웹 검색으로
// 확인(한국경제 2026-06-29/경향신문 2026-06-08 보도). 이 통합은 동구 전체가 예외 없이 제물포구로
// 흡수되는 것이라 주소 텍스트 확인 없이 안전하게 일괄 치환할 수 있다.
//
// 반면 옛 "서구"는 경인아라뱃길을 기준으로 북쪽 검단구/남쪽 서해구로 "분할"되는 것이라 동일하게
// 처리할 수 없다 — 주소의 동 이름만으로는 어느 쪽인지 판단할 근거(공식 동 목록 또는 좌표 기반 경계)를
// 찾지 못해 이번엔 건드리지 않는다(docs/TASK.md 리스크 메모 참고).
async function main() {
  const result = await prisma.collectionPoint.updateMany({
    where: { ctpvNm: '인천광역시', sggNm: '동구' },
    data: { sggNm: '제물포구' },
  })
  console.log(`인천광역시 동구 -> 제물포구: ${result.count}건 갱신`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
