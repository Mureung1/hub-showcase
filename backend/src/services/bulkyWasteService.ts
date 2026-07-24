import { prisma } from '../config/prisma'
import { AppError } from '../middlewares/errorHandler'

// 선택된 지역에서 실제로 수수료 데이터가 있는 품목명 목록 — 품목 선택 드롭다운에 사용.
export function getBulkyWasteItems(ctpvNm: string, sggNm: string) {
  return prisma.bulkyWasteFee.findMany({
    where: { ctpvNm, sggNm },
    distinct: ['itemName'],
    select: { itemName: true, category: true },
    orderBy: { itemName: 'asc' },
  })
}

// 같은 품목명이 크기/종류별로 여러 수수료 행을 가질 수 있다 — spec(규격) 필드로 구분되는 행도 있고
// (전국 약 52%), 지자체가 규격을 신고하지 않아 구분이 안 되는 행도 있다(나머지 약 48%, spec이 null).
// 어느 쪽이든 하나를 임의로 골라내지 않고 해당 품목의 모든 수수료 후보를 그대로 반환한다(CLAUDE.md 원칙).
export async function getBulkyWasteFee(ctpvNm: string, sggNm: string, itemName: string) {
  const fees = await prisma.bulkyWasteFee.findMany({
    where: { ctpvNm, sggNm, itemName },
    orderBy: { fee: 'asc' },
  })

  if (fees.length === 0) {
    throw new AppError('해당 품목/지역의 수수료 정보를 찾을 수 없습니다', 404)
  }

  // 공식 신고 사이트는 수동으로 확인된 지자체만 존재 — 없으면 null(프론트에서 "아직 없음"으로 안내하되,
  // mngInstNm이 있으면 최소한 문의처 이름이라도 보여준다).
  const reportSite = await prisma.bulkyWasteReportSite.findUnique({
    where: { ctpvNm_sggNm: { ctpvNm, sggNm } },
  })
  const managingInstitution = fees.find((fee) => fee.mngInstNm)?.mngInstNm ?? null

  return { fees, reportSite, managingInstitution }
}
