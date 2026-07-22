interface ProfileParams {
  industry: string
  isCorporation: boolean
  hasEmployee: boolean
  isRented: boolean
  closureDate: string
}

const taskConditions: Record<string, (p: ProfileParams) => boolean> = {
  'business-closure-report': () => true,
  'insurance-loss-report': (p) => p.hasEmployee,
  'food-service-business-report-closure': (p) => p.industry === '요식업',
  'online-retail-report-closure': (p) => p.industry === '소매업',
  'lease-termination': (p) => p.isRented,
  'vat-final-return': () => true,
  'income-tax-return': () => true,
  'store-demolition-subsidy': (p) => p.isRented,
  'reemployment-program': () => true,
}

export function getFilteredTaskIds(profile: ProfileParams): string[] {
  return Object.entries(taskConditions)
    .filter(([, condition]) => condition(profile))
    .map(([id]) => id)
}
