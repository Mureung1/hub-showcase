export interface ExpenseDraft {
  name: string
  amount: number
  category: string
}

export interface UploadResult {
  receiptId: number
  ocrStatus: 'PENDING' | 'SUCCESS' | 'FAILED'
  storeName: string | null
  spentAt: string
  items: ExpenseDraft[]
}

export async function uploadReceipt(
  file: File,
  sourceType: 'PAPER_RECEIPT' | 'ORDER_SCREEN'
): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`/api/receipts/upload?sourceType=${sourceType}`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error('영수증 업로드에 실패했어요.')
  }
  return res.json()
}

export async function confirmReceipt(
  receiptId: number,
  items: ExpenseDraft[],
  spentAt: string
): Promise<void> {
  const res = await fetch(`/api/receipts/${receiptId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spentAt, items }),
  })

  if (!res.ok) {
    throw new Error('지출 저장에 실패했어요.')
  }
}

export async function createManualExpense(
  amount: number,
  category: string,
  memo: string,
  spentAt: string
): Promise<void> {
  const res = await fetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, category, memo, spentAt }),
  })

  if (!res.ok) {
    throw new Error('지출 저장에 실패했어요.')
  }
}

export type SummaryPeriod = 'week' | 'month' | '3months'

export interface CategorySummaryItem {
  category: string
  amount: number
  percent: number
}

export interface ExpenseSummary {
  total: number
  categories: CategorySummaryItem[]
}

export interface DailyAmount {
  day: string
  amount: number
}

export async function getExpenseSummary(period: SummaryPeriod): Promise<ExpenseSummary> {
  const res = await fetch(`/api/expenses/summary?period=${period}`)
  if (!res.ok) {
    throw new Error('소비 요약을 불러오지 못했어요.')
  }
  return res.json()
}

export async function getDailyExpenses(): Promise<DailyAmount[]> {
  const res = await fetch('/api/expenses/summary/daily')
  if (!res.ok) {
    throw new Error('일별 지출을 불러오지 못했어요.')
  }
  return res.json()
}
export interface Subscription {
  id: number
  name: string
  price: number
  billingDay: number
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const res = await fetch('/api/subscriptions')
  if (!res.ok) {
    throw new Error('구독 목록을 불러오지 못했어요.')
  }
  return res.json()
}

export async function createSubscription(name: string, price: number, billingDay: number): Promise<Subscription> {
  const res = await fetch('/api/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price, billingDay }),
  })
  if (!res.ok) {
    throw new Error('구독 등록에 실패했어요.')
  }
  return res.json()
}

export async function updateSubscription(id: number, name: string, price: number, billingDay: number): Promise<Subscription> {
  const res = await fetch(`/api/subscriptions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price, billingDay }),
  })
  if (!res.ok) {
    throw new Error('구독 수정에 실패했어요.')
  }
  return res.json()
}

export async function deleteSubscription(id: number): Promise<void> {
  const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error('구독 삭제에 실패했어요.')
  }
}

export interface Budget {
  amount: number | null
}

export async function getBudget(): Promise<Budget> {
  const res = await fetch('/api/budget')
  if (!res.ok) {
    throw new Error('예산을 불러오지 못했어요.')
  }
  return res.json()
}

export async function setBudget(amount: number): Promise<Budget> {
  const res = await fetch('/api/budget', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  })
  if (!res.ok) {
    throw new Error('예산 저장에 실패했어요.')
  }
  return res.json()
}

export interface Prediction {
  depletionDate: string | null
  dailyAverage: number
  remainingBudget: number | null
  dataQualityNotice: string | null
  survivalMode: boolean
}

export async function getPrediction(): Promise<Prediction> {
  const res = await fetch('/api/expenses/prediction')
  if (!res.ok) {
    throw new Error('소비 예측을 불러오지 못했어요.')
  }
  return res.json()
}