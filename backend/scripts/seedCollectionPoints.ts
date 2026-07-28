import 'dotenv/config'
import { prisma } from '../src/config/prisma'

// 건전지/형광등/폐의약품/의류는 scripts/syncCollectionPoints.ts가 실 공공데이터(전국폐형광등폐건전지수거함/
// 전국폐의약품수거함/전국의류수거함 표준데이터)로 관리 — 이 스크립트는 그 4개와 무관하게 소형가전/종이팩만 시드한다.
//
// 소형가전: 한국환경공단_폐전자제품 수거함 위치정보(15106385)가 있으나 fileData(1회성 업로드)이고
// 문서에 나온 Open API 엔드포인트 추정 URL이 실제로는 404 — 안정적으로 호출 가능한 API가 확인되지
// 않아 자동 동기화를 붙이지 않았다. 종이팩은 애초에 전국 단위 표준데이터 자체가 없음(개별 지자체 홈페이지
// 안내만 존재, 대형폐기물 수수료 때처럼 지자체별 스크레이핑은 하지 않기로 함).
// 따라서 두 카테고리 모두 데모용 예시 데이터로 시드(prototype/points.html의 예시 명칭 재사용) —
// 실제 데이터 소스가 확보되면 이 스크립트를 교체한다.
const COLLECTION_POINTS = [
  {
    category: '소형가전',
    name: '센텀역 3번 출구',
    address: '부산광역시 해운대구 우동',
    hours: '상시(지하 통로 4번)',
    ctpvNm: '부산광역시',
    sggNm: '해운대구',
  },
  {
    category: '소형가전',
    name: '역삼1동 주민센터',
    address: '서울특별시 강남구 역삼동',
    hours: '평일 09:00-18:00',
    ctpvNm: '서울특별시',
    sggNm: '강남구',
  },
  {
    category: '종이팩',
    name: '우동 주민센터',
    address: '부산광역시 해운대구 우동',
    hours: '24시간 스마트 수거함',
    ctpvNm: '부산광역시',
    sggNm: '해운대구',
  },
  {
    category: '종이팩',
    name: '북구청 재활용센터',
    address: '대구광역시 북구 산격동',
    hours: '평일 09:00-18:00',
    ctpvNm: '대구광역시',
    sggNm: '북구',
  },
]

async function main() {
  await prisma.collectionPoint.deleteMany({ where: { category: { in: ['소형가전', '종이팩'] } } })
  await prisma.collectionPoint.createMany({ data: COLLECTION_POINTS })
  console.log(`seeded ${COLLECTION_POINTS.length} collection points`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
