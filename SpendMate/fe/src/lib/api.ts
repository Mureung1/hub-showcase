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

export interface ConfirmReceiptResult {
  expenses: { id: number; itemName: string; amount: number }[]
  agentMessage: string | null
}

export async function confirmReceipt(
  receiptId: number,
  items: ExpenseDraft[],
  spentAt: string
): Promise<ConfirmReceiptResult> {
  const res = await fetch(`/api/receipts/${receiptId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spentAt, items }),
  })

  if (!res.ok) {
    throw new Error('지출 저장에 실패했어요.')
  }
  return res.json()
}

export interface CreateExpenseResult {
  id: number
  itemName: string
  amount: number
  category: string
  spentAt: string
  agentMessage: string | null
}

export async function createManualExpense(
  amount: number,
  category: string,
  memo: string,
  spentAt: string
): Promise<CreateExpenseResult> {
  const res = await fetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, category, memo, spentAt }),
  })

  if (!res.ok) {
    throw new Error('지출 저장에 실패했어요.')
  }
  return res.json()
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

export interface RecentExpense {
  id: number
  name: string
  category: string
  amount: number
  spentAt: string
}

export async function getRecentExpenses(limit = 20): Promise<RecentExpense[]> {
  const res = await fetch(`/api/expenses/recent?limit=${limit}`)
  if (!res.ok) {
    throw new Error('최근 지출을 불러오지 못했어요.')
  }
  return res.json()
}

export interface DailySpend {
  day: number
  amount: number
}

export async function getDailyCalendar(): Promise<DailySpend[]> {
  const res = await fetch('/api/expenses/daily-calendar')
  if (!res.ok) {
    throw new Error('캘린더 데이터를 불러오지 못했어요.')
  }
  return res.json()
}

export interface Context {
  deliveryIncreaseRate: number | null
  budgetUsageRate: number | null
  longTermSignal: {
    qualityNotice: string | null
    composition: { category: string; percent: number }[]
    trend: { category: string; trend: 'UP' | 'DOWN' | 'FLAT' }[]
    subscriptionStatus: { count: number; totalAmount: number }
  }
}

export async function getContext(): Promise<Context> {
  const res = await fetch('/api/context')
  if (!res.ok) {
    throw new Error('소비 신호를 불러오지 못했어요.')
  }
  return res.json()
}

export interface AgentChatResponse {
  message: string
}

export async function sendAgentMessage(message: string): Promise<AgentChatResponse> {
  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) {
    throw new Error('AI 코치와 연결하지 못했어요.')
  }
  return res.json()
}

export interface AuthUser {
  id: number
  email: string
  nickname: string
}

async function authErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json()
    return body?.error || fallback
  } catch {
    return fallback
  }
}

export async function signup(email: string, password: string, nickname: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, nickname }),
  })
  if (!res.ok) {
    throw new Error(await authErrorMessage(res, '회원가입에 실패했어요.'))
  }
  return res.json()
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new Error(await authErrorMessage(res, '로그인에 실패했어요.'))
  }
  return res.json()
}

/** 새로고침 시 세션이 아직 살아있는지 확인. 로그인 안 된 상태면 null을 반환한다 (에러를 던지지 않음). */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me')
  if (!res.ok) {
    return null
  }
  return res.json()
}

export async function updateProfile(email: string, nickname: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, nickname }),
  })
  if (!res.ok) {
    throw new Error(await authErrorMessage(res, '프로필 저장에 실패했어요.'))
  }
  return res.json()
}

export interface SavingsMission {
  category: string
  suggestion: string
  estimatedSaving: number
}

export interface SavingsMissionResponse {
  missions: SavingsMission[]
  totalEstimatedSaving: number
}

export async function getSavingsMissions(): Promise<SavingsMissionResponse> {
  const res = await fetch('/api/expenses/savings-missions')
  if (!res.ok) {
    throw new Error('절약 미션을 불러오지 못했어요.')
  }
  return res.json()
}

export interface CategoryChange {
  category: string
  thisMonthAmount: number
  lastMonthAmount: number
  changePercent: number
}

export async function getCategoryChanges(): Promise<CategoryChange[]> {
  const res = await fetch('/api/expenses/category-changes')
  if (!res.ok) {
    throw new Error('카테고리 변화를 불러오지 못했어요.')
  }
  return res.json()
}