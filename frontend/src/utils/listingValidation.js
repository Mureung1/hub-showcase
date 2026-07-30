export function hasListingContent(fields, ocrText) {
  return Boolean(String(ocrText || '').trim()) || Object.values(fields).some((value) => String(value).trim())
}

export function createListingWarnings(fields) {
  const warnings = []

  if (!String(fields.address || '').trim()) {
    warnings.push('주소가 없어 지도 기반 통학 시간 계산이 제한됩니다.')
  }

  if (
    !String(fields.deposit || '').trim()
    && !String(fields.monthlyRent || '').trim()
    && !String(fields.maintenanceFee || '').trim()
  ) {
    warnings.push('보증금, 월세, 관리비 정보가 부족해 비용 판단 정확도가 낮아질 수 있습니다.')
  }

  if (!String(fields.supplyArea || '').trim() && !String(fields.exclusiveArea || '').trim() && !String(fields.floor || '').trim()) {
    warnings.push('면적 또는 층수 정보가 부족해 매물 조건 판단이 제한됩니다.')
  }

  if (!String(fields.approvalDate || '').trim() && !String(fields.buildingUse || '').trim()) {
    warnings.push('사용승인일 또는 건축물 용도 정보가 없어 노후도와 용도 판단이 제한됩니다.')
  }

  return warnings
}

export function createListingSummary(fields) {
  const priceParts = [
    fields.deposit ? `보증금 ${fields.deposit}` : '',
    fields.monthlyRent ? `월세 ${fields.monthlyRent}` : '',
    fields.maintenanceFee ? `관리비 ${fields.maintenanceFee}` : '',
  ].filter(Boolean)

  return {
    address: fields.address || '주소 미입력',
    price: priceParts.length ? priceParts.join(' / ') : '가격 정보 부족',
    area: fields.exclusiveArea || fields.supplyArea || '면적 미입력',
    floor: fields.floor || '층수 미입력',
    structure: [fields.listingType, fields.roomStructure, fields.duplexType].filter(Boolean).join(' · ') || '구조 정보 부족',
  }
}

export function createUserSummary(userInfo) {
  return {
    school: userInfo.school || '학교 미입력',
    contractType: userInfo.contractType || '계약 유형 미입력',
    budget: userInfo.budget ? `${Number(userInfo.budget).toLocaleString()}만원` : '예산 미입력',
    commuteDaysPerWeek: userInfo.commuteDaysPerWeek
      ? `주 ${userInfo.commuteDaysPerWeek}회`
      : '등교 횟수 미입력',
    maxTravelTime: userInfo.maxTravelTime ? `${userInfo.maxTravelTime}분 이내` : '최대 이동 시간 미입력',
  }
}
