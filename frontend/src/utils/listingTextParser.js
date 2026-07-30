import { defaultListingFields } from './listingStorage'

const knownLabels = [
  '소재지',
  '매물특징',
  '공급/전용면적',
  '공급/전용 면적',
  '전용 면적',
  '해당층/총층',
  '해당층',
  '방수/욕실수',
  '방수 / 욕실수',
  '관리비',
  '입주가능일',
  '입주 가능일',
  '사용승인일',
  '사용 승인일',
  '방향',
  '주차가능여부',
  '주차 가능 여부',
  '방구조',
  '복층여부',
  '건축물 용도',
  '매물번호',
  '총주차대수',
  '옵션',
  '거래유형',
  '거래 유형',
]

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeOcrText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[|]/g, ' ')
}

function readValueAfterLabel(text, label) {
  const lines = normalizeOcrText(text)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const lineIndex = lines.findIndex((item) => item.includes(label))
  const line = lines[lineIndex]
  if (!line) {
    return ''
  }

  const value = line
    .replace(new RegExp(`^.*?${escapeRegExp(label)}`), '')
    .replace(/^[:|\-\s]+/, '')
    .replace(createNextLabelPattern(label), '')
    .trim()

  if (value) {
    return value
  }

  return lines[lineIndex + 1]?.replace(createNextLabelPattern(label), '').trim() || ''
}

function createNextLabelPattern(currentLabel) {
  const nextLabels = knownLabels
    .filter((label) => label !== currentLabel)
    .map(escapeRegExp)
    .join('|')

  return new RegExp(`\\s+(?:${nextLabels}).*$`)
}

function readAnyValueAfterLabel(text, labels) {
  return labels.map((label) => readValueAfterLabel(text, label)).find(Boolean) || ''
}

function readTitleRent(text) {
  const monthlyRentMatch = normalizeOcrText(text).match(/월세\s*([0-9,]+)\s*\/\s*([0-9,]+)/)
  if (!monthlyRentMatch) {
    return {}
  }

  return {
    deposit: monthlyRentMatch[1],
    monthlyRent: monthlyRentMatch[2],
  }
}

function readListingType(text) {
  const lines = normalizeOcrText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const line = lines.find((item) => /(원룸|투룸|오피스텔|빌라|아파트)/.test(item) && !item.includes('월세'))
  const match = line?.match(/(일반원룸|원룸|투룸|오피스텔|빌라|아파트)/)
  return match?.[1] || line || ''
}

function readVerificationDate(text) {
  const match = normalizeOcrText(text).match(/확인매물\s*([0-9]{2}\.[0-9]{2}\.[0-9]{2})/)
  return match?.[1] || ''
}

function normalizeAreaUnit(value) {
  const normalized = String(value || '').replace(/\s+/g, '').replace(/m2|m²|제곱미터/gi, '㎡')
  if (!normalized) {
    return ''
  }

  return /㎡$/.test(normalized) ? normalized : `${normalized}㎡`
}

function readAreaRatio(text) {
  const normalized = normalizeOcrText(text)
  const ratioMatch = normalized.match(/전용률\s*([0-9.]+\s*%)/)
    || normalized.match(/\(\s*전용률\s*([0-9.]+)\s*\)/)
    || normalized.match(/공급\s*\/\s*전용\s*면적[\s\S]{0,80}?\(\s*([0-9.]+)\s*%?\s*\)/)
  if (!ratioMatch) {
    return ''
  }

  return ratioMatch[1].replace(/\s+/g, '').replace(/%?$/, '%')
}

function readCombinedAreaFromText(value, requireAreaLabel = false) {
  const normalized = normalizeOcrText(value)
    .replace(/[|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const areaUnit = '(?:㎡|m2|m²|제곱미터)'
  const labeledPrefix = '(?:공급\\s*[\\/／]\\s*전용\\s*면적|공급\\s*전용\\s*면적|공급면적\\s*[\\/／]\\s*전용면적)'
  const prefix = requireAreaLabel ? `${labeledPrefix}[^0-9]{0,30}` : ''
  const match = normalized.match(
    new RegExp(`${prefix}([0-9.]+)\\s*${areaUnit}?\\s*[\\/／]\\s*([0-9.]+)\\s*${areaUnit}?\\s*(?:\\(\\s*(?:전용률\\s*)?([0-9.]+)\\s*%?\\s*\\))?`, 'i'),
  )

  if (!match) {
    return null
  }

  return {
    supplyArea: normalizeAreaUnit(match[1]),
    exclusiveArea: normalizeAreaUnit(match[2]),
    areaRatio: match[3] ? `${match[3].replace(/\s+/g, '')}%` : '',
  }
}

function readAreaFields(text) {
  const normalized = normalizeOcrText(text).replace(/\s+/g, ' ')
  const area = readAnyValueAfterLabel(text, ['공급/전용면적', '공급/전용 면적', '공급 전용면적'])
  const combinedArea = readCombinedAreaFromText(area) || readCombinedAreaFromText(normalized, true)
  const supplyOnlyMatch = normalized.match(/공급\s*(?:면적)?\s*([0-9.]+\s*(?:㎡|m2|m²|제곱미터))/i)
  const exclusiveOnlyMatch = normalized.match(/전용\s*(?:면적)?\s*([0-9.]+\s*(?:㎡|m2|m²|제곱미터))/i)
  const areaRatio = combinedArea?.areaRatio || readAreaRatio(text)

  if (!combinedArea) {
    return {
      supplyArea: supplyOnlyMatch ? normalizeAreaUnit(supplyOnlyMatch[1]) : normalizeAreaUnit(area),
      exclusiveArea: exclusiveOnlyMatch ? normalizeAreaUnit(exclusiveOnlyMatch[1]) : '',
      areaRatio,
    }
  }

  return {
    supplyArea: combinedArea.supplyArea,
    exclusiveArea: combinedArea.exclusiveArea,
    areaRatio,
  }
}

function readMaintenanceFee(text) {
  const labeledValue = readValueAfterLabel(text, '관리비')
  const labeledMatch = labeledValue.match(/([0-9,.]+\s*(?:만\s*)?원|[0-9,.]+\s*만원|없음|무|무료)/)
  if (labeledMatch) {
    return labeledMatch[1].replace(/\s+/g, '')
  }

  const normalized = normalizeOcrText(text).replace(/\s+/g, ' ')
  const contextMatch = normalized.match(/관리\s*비\s*[:|\-\s]*([0-9,.]+\s*(?:만\s*)?원|[0-9,.]+\s*만원|없음|무|무료)/)
  return contextMatch?.[1]?.replace(/\s+/g, '') || labeledValue
}

function readHeaderStructure(text) {
  const header = normalizeOcrText(text)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .find((line) => line.includes('분리형') || line.includes('오픈형') || line.includes('단층') || line.includes('복층'))

  return {
    roomStructure: header?.match(/(분리형|오픈형)/)?.[1] || '',
    duplexType: header?.match(/(단층|복층)/)?.[1] || '',
  }
}

export function parseListingFieldsFromText(text) {
  const titleRent = readTitleRent(text)
  const areaFields = readAreaFields(text)
  const headerStructure = readHeaderStructure(text)

  return {
    ...defaultListingFields,
    ...titleRent,
    listingType: readListingType(text),
    transactionType: titleRent.monthlyRent ? '월세' : readAnyValueAfterLabel(text, ['거래유형', '거래 유형']),
    verificationDate: readVerificationDate(text),
    address: readValueAfterLabel(text, '소재지'),
    maintenanceFee: readMaintenanceFee(text),
    ...areaFields,
    floor: readAnyValueAfterLabel(text, ['해당층/총층', '해당층']),
    roomBathroomCount: readAnyValueAfterLabel(text, ['방수/욕실수', '방수 / 욕실수']),
    moveInAvailableDate: readAnyValueAfterLabel(text, ['입주가능일', '입주 가능일']),
    approvalDate: readAnyValueAfterLabel(text, ['사용승인일', '사용 승인일']),
    direction: readValueAfterLabel(text, '방향'),
    parkingAvailable: readAnyValueAfterLabel(text, ['주차가능여부', '주차 가능 여부']),
    roomStructure: readValueAfterLabel(text, '방구조') || headerStructure.roomStructure,
    duplexType: readValueAfterLabel(text, '복층여부') || headerStructure.duplexType,
    buildingUse: readValueAfterLabel(text, '건축물 용도'),
    listingNumber: readValueAfterLabel(text, '매물번호'),
    totalParkingCount: readValueAfterLabel(text, '총주차대수'),
    options: readAnyValueAfterLabel(text, ['매물특징', '옵션']),
  }
}
