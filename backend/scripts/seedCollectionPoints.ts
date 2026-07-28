import 'dotenv/config'
import { prisma } from '../src/config/prisma'

// 기후에너지환경부_분리배출 정보조회 서비스(15156866)의 getSpot 오퍼레이션이 위치 정보를 제공하지만,
// 실제로 호출해보니 pageNo/numOfRows/itemNm 등 통상적인 파라미터 조합 모두
// "INVALID_REQUEST_PARAMETER_ERROR"를 반환함 — 좌표 기반 검색만 지원하는 것으로 추정되며,
// 이번 이슈 범위(좌표 제외, 카테고리별 목록)와 맞지 않아 채택하지 않았다. 실 데이터 소스가 확정되기
// 전까지는 데모용 예시 데이터로 시드하고(prototype/points.html의 예시 명칭 재사용), 실제 지자체별
// 수거함 데이터가 확보되면 이 스크립트를 교체한다.
const COLLECTION_POINTS = [
  { category: '건전지', name: '우동 주민센터', address: '부산광역시 해운대구 우동', hours: '24시간 스마트 수거함' },
  { category: '건전지', name: '역삼1동 주민센터', address: '서울특별시 강남구 역삼동', hours: '평일 09:00-18:00' },
  { category: '형광등', name: '해운대 그린파크', address: '부산광역시 해운대구 우동', hours: '상시(정문 광장 입구)' },
  { category: '형광등', name: '북구청 재활용센터', address: '대구광역시 북구 산격동', hours: '평일 09:00-18:00' },
  { category: '소형가전', name: '센텀역 3번 출구', address: '부산광역시 해운대구 우동', hours: '상시(지하 통로 4번)' },
  { category: '소형가전', name: '역삼1동 주민센터', address: '서울특별시 강남구 역삼동', hours: '평일 09:00-18:00' },
  { category: '종이팩', name: '우동 주민센터', address: '부산광역시 해운대구 우동', hours: '24시간 스마트 수거함' },
  { category: '종이팩', name: '북구청 재활용센터', address: '대구광역시 북구 산격동', hours: '평일 09:00-18:00' },
]

async function main() {
  await prisma.collectionPoint.deleteMany()
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
