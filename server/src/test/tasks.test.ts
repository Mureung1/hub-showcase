import { getFilteredTaskIds } from '../data/tasks.js'

test('요식업·직원있음·임대: 해당 taskId만 포함된다', () => {
  const ids = getFilteredTaskIds({
    industry: '요식업',
    isCorporation: false,
    hasEmployee: true,
    isRented: true,
    closureDate: '2026-09-30',
  })
  expect(ids).toContain('business-closure-report')
  expect(ids).toContain('insurance-loss-report')
  expect(ids).toContain('food-service-business-report-closure')
  expect(ids).not.toContain('online-retail-report-closure')
  expect(ids).toContain('lease-termination')
  expect(ids).toContain('store-demolition-subsidy')
  expect(ids).toContain('vat-final-return')
  expect(ids).toContain('income-tax-return')
  expect(ids).toContain('reemployment-program')
})

test('소매업·직원없음·자가: 소매업 항목만 포함, 음식점/직원/임대 항목 제외', () => {
  const ids = getFilteredTaskIds({
    industry: '소매업',
    isCorporation: false,
    hasEmployee: false,
    isRented: false,
    closureDate: '2026-09-30',
  })
  expect(ids).toContain('online-retail-report-closure')
  expect(ids).not.toContain('food-service-business-report-closure')
  expect(ids).not.toContain('insurance-loss-report')
  expect(ids).not.toContain('lease-termination')
  expect(ids).not.toContain('store-demolition-subsidy')
})
