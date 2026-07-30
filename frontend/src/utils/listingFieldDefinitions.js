export const listingFieldGroups = [
  {
    title: '기본 정보',
    fields: [
      ['listingType', '매물 유형', '예: 일반원룸'],
      ['transactionType', '거래 유형', '예: 월세'],
      ['address', '주소', '예: 경상남도 진주시 가좌동 1436-6'],
      ['verificationDate', '확인매물 날짜', '예: 26.07.21'],
    ],
  },
  {
    title: '가격과 면적',
    fields: [
      ['deposit', '보증금', '예: 300'],
      ['monthlyRent', '월세', '예: 36'],
      ['maintenanceFee', '관리비', '예: 9만원'],
      ['supplyArea', '공급면적', '예: 40㎡'],
      ['exclusiveArea', '전용면적', '예: 30㎡'],
      ['areaRatio', '전용률', '예: 75%'],
    ],
  },
  {
    title: '층과 구조',
    fields: [
      ['floor', '해당층/총층', '예: 2/3층'],
      ['roomBathroomCount', '방수/욕실수', '예: 1/1개'],
      ['roomStructure', '방구조', '예: 분리형'],
      ['duplexType', '복층여부', '예: 단층'],
      ['buildingUse', '건축물 용도', '예: 단독주택'],
    ],
  },
  {
    title: '생활 조건',
    fields: [
      ['moveInAvailableDate', '입주가능일', '예: 즉시입주 협의가능'],
      ['approvalDate', '사용승인일', '예: 2006.07.10'],
      ['direction', '방향', '예: 남향(거실 기준)'],
      ['parkingAvailable', '주차가능여부', '예: 가능'],
      ['totalParkingCount', '총주차대수', '예: 3대'],
      ['options', '옵션/매물특징', '예: 분리형 풀옵션 원룸'],
      ['distanceFromSchool', '학교와의 거리', '예: 도보 15분'],
    ],
  },
  {
    title: '식별 정보',
    fields: [
      ['listingNumber', '매물번호', '예: 2639294751'],
    ],
  },
]

export const listingFields = listingFieldGroups.flatMap((group) => group.fields)

export const listingFieldNames = listingFields.map(([name]) => name)

export const listingFieldLabels = Object.fromEntries(
  listingFields.map(([name, label]) => [name, label]),
)
