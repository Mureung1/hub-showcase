import 'dotenv/config'
import { prisma } from '../src/config/prisma'

// 대형폐기물 수수료 API에는 공식 신고 사이트 URL이 없어(BulkyWasteReportSite 모델 주석 참고) 실제로
// 접속해 확인한 지자체만 여기 시드로 관리한다 — 임의로 URL을 만들어내지 않는다.
const REPORT_SITES = [
  {
    ctpvNm: '부산광역시',
    sggNm: '해운대구',
    reportUrl: 'https://www.haeundae.go.kr/index.do?menuCd=DOM_000000102014007000',
  },
  {
    ctpvNm: '대구광역시',
    sggNm: '북구',
    reportUrl: 'http://www.buk.daegu.kr/index.do?menu_id=00001797',
  },
]

async function main() {
  for (const site of REPORT_SITES) {
    await prisma.bulkyWasteReportSite.upsert({
      where: { ctpvNm_sggNm: { ctpvNm: site.ctpvNm, sggNm: site.sggNm } },
      update: { reportUrl: site.reportUrl },
      create: site,
    })
  }
  console.log(`seeded ${REPORT_SITES.length} report sites`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
