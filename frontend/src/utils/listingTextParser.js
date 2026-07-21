import { defaultListingFields } from './listingStorage'

function readValueAfterLabel(text, label) {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const line = lines.find((item) => item.includes(label))
  if (!line) {
    return ''
  }

  return line
    .replace(label, '')
    .replace(/^[:|\-\s]+/, '')
    .trim()
}

function readTitleRent(text) {
  const monthlyRentMatch = text.match(/월세\s*([0-9,]+)\s*\/\s*([0-9,]+)/)
  if (!monthlyRentMatch) {
    return {}
  }

  return {
    deposit: monthlyRentMatch[1],
    monthlyRent: monthlyRentMatch[2],
  }
}

export function parseListingFieldsFromText(text) {
  const titleRent = readTitleRent(text)
  const floor = readValueAfterLabel(text, '해당층/총층') || readValueAfterLabel(text, '해당층')
  const area = readValueAfterLabel(text, '공급/전용면적') || readValueAfterLabel(text, '전용 면적')

  return {
    ...defaultListingFields,
    ...titleRent,
    address: readValueAfterLabel(text, '소재지'),
    maintenanceFee: readValueAfterLabel(text, '관리비'),
    area,
    floor,
    options: readValueAfterLabel(text, '매물특징'),
  }
}
