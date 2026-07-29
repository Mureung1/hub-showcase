import { useState, useEffect } from 'react'
import { ChevronRight, Bell, Shield, HelpCircle, LogOut, Tv, Music, Cloud, ShoppingBag, CreditCard, TrendingDown, Zap, Target, X, Plus, Trash2, Check, User } from 'lucide-react'
import ToggleSwithch from '../components/ToggleSwitch'
import {
  getSubscriptions, getBudget, setBudget, createSubscription, updateSubscription, deleteSubscription,
  getPrediction, updateProfile, getSavingsMissions,
  type Subscription as ApiSubscription, type AuthUser, type Prediction, type SavingsMissionResponse,
} from '../lib/api'

type Subscription = {
  id? : number
  name: string
  price: number
  billingDay: number
  icon: typeof Tv
  color: string
  bg: string
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

export function getNextBillingInfo(billingDay: number, now: Date = new Date()) {
  const today = now
  const y = today.getFullYear()
  const m = today.getMonth()
  const startOfToday = new Date(y, m, today.getDate())
  let next = new Date(y, m, Math.min(billingDay, daysInMonth(y, m)))
  if (next < startOfToday) next = new Date(y, m + 1, Math.min(billingDay, daysInMonth(y, m + 1)))
  const dday = Math.round((next.getTime() - startOfToday.getTime()) / 86400000)
  return { label: `${next.getMonth() + 1}월 ${next.getDate()}일`, dday }
}

function getSubscriptionMeta(name: string): { icon: typeof Tv; color: string; bg: string } {
  if (name.includes('넷플릭스')) return { icon: Tv, color: '#E50914', bg: '#FEF2F2' }
  if (name.includes('유튜브')) return { icon: Tv, color: '#FF0000', bg: '#FFF0F0' }
  if (name.includes('멜론')) return { icon: Music, color: '#00C2A1', bg: '#E6FAF7' }
  if (name.includes('iCloud') || name.includes('아이클라우드')) return { icon: Cloud, color: '#007AFF', bg: '#EBF2FF' }
  return { icon: CreditCard, color: '#4F8EF7', bg: '#EBF2FF' }
}

const MENU_ITEMS = [
  { icon: Bell,        label: '알림 설정',    color: '#4F8EF7' },
  { icon: Shield,      label: '개인정보 보호', color: '#6ED6C8' },
  { icon: HelpCircle,  label: '고객센터',     color: '#FFC857' },
  { icon: LogOut,      label: '로그아웃',     color: '#FF6B6B' },
]

type BudgetItem = { label: string; amount: string }

/* ── 프로필 편집 모달 ── */
function ProfileEditModal({ onClose, user, onUpdated }: { onClose: () => void; user: AuthUser | null; onUpdated: (user: AuthUser) => void }) {
  const [name, setName] = useState(user?.nickname ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    try {
      const updated = await updateProfile(email, name)
      onUpdated(updated)
      setSaved(true)
      setTimeout(onClose, 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : '프로필 저장에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: 393, background: 'var(--background)', borderRadius: '28px 28px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
        </div>

        <div style={{ padding: '12px 20px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--foreground)' }}>프로필 편집</h2>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 99, background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color="var(--muted)" />
            </button>
          </div>

          {/* Avatar */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 80, height: 80, borderRadius: 26, background: 'linear-gradient(135deg, #4F8EF7, #6ED6C8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 32, fontWeight: 900 }}>
                {name[0] || '사'}
              </div>
              <button style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: 99, background: '#4F8EF7', border: '3px solid var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <User size={12} color="white" />
              </button>
            </div>
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>이름</p>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: '100%', background: 'white', border: '1.5px solid var(--border)', borderRadius: 14, padding: '14px 16px', fontSize: 15, fontWeight: 600, color: 'var(--foreground)', outline: 'none', fontFamily: 'Pretendard', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>이메일</p>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', background: 'white', border: '1.5px solid var(--border)', borderRadius: 14, padding: '14px 16px', fontSize: 15, fontWeight: 600, color: 'var(--foreground)', outline: 'none', fontFamily: 'Pretendard', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {error && (
            <p style={{ margin: '12px 0 0', fontSize: 13, color: '#FF6B6B', fontWeight: 600 }}>{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              marginTop: 24, width: '100%', height: 52, borderRadius: 16, border: 'none', cursor: saving ? 'default' : 'pointer',
              fontFamily: 'Pretendard', fontSize: 16, fontWeight: 800,
              background: saved ? '#6ED6C8' : 'linear-gradient(135deg, #4F8EF7, #6B5CF0)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.3s', opacity: saving ? 0.7 : 1,
            }}
          >
            {saved ? <><Check size={18} /> 저장됐어요!</> : saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 예산 수정 모달 ── */
function BudgetEditModal({ totalBudget, onClose, onSaved }: { totalBudget: number | null; onClose: () => void; onSaved: (amount: number) => void }) {
  const [items, setItems] = useState<BudgetItem[]>([
    { label: '월 총 예산', amount: totalBudget != null ? String(totalBudget) : '' },
    { label: '식비',     amount: '200000' },
    { label: '외식',     amount: '150000' },
    { label: '교통',     amount: '80000' },
  ])
  const [saved, setSaved] = useState(false)

  const updateItem = (idx: number, field: keyof BudgetItem, value: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const addItem = () => {
    setItems(prev => [...prev, { label: '', amount: '' }])
  }

  const removeItem = (idx: number) => {
    if (idx === 0) return // 월 총 예산은 삭제 불가
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = () => {
    const amount = Number(items[0].amount)
    if (!amount || amount <= 0) return
    setBudget(amount)
      .then(() => {
        onSaved(amount)
        setSaved(true)
        setTimeout(onClose, 800)
      })
      .catch(() => {})
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: 393, maxHeight: '80%', background: 'var(--background)', borderRadius: '28px 28px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
        </div>

        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--foreground)' }}>예산 수정</h2>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>카테고리별 예산을 설정해요</p>
            </div>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 99, background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color="var(--muted)" />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }} className="no-scrollbar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ background: 'white', borderRadius: 16, padding: '14px 16px', border: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', gap: 10 }}>
                  <input
                    value={item.label}
                    onChange={e => updateItem(idx, 'label', e.target.value)}
                    placeholder="카테고리명"
                    readOnly={idx === 0}
                    style={{ flex: 1, background: idx === 0 ? 'var(--background)' : 'white', border: `1px solid ${idx === 0 ? 'transparent' : 'var(--border)'}`, borderRadius: 10, padding: '8px 12px', fontSize: 14, fontWeight: 600, color: 'var(--foreground)', outline: 'none', fontFamily: 'Pretendard' }}
                  />
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      value={item.amount ? Number(item.amount).toLocaleString() : ''}
                      onChange={e => updateItem(idx, 'amount', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                      style={{ width: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 28px 8px 12px', fontSize: 14, fontWeight: 700, color: 'var(--foreground)', outline: 'none', fontFamily: 'Pretendard', boxSizing: 'border-box' }}
                    />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>원</span>
                  </div>
                </div>
                {idx > 0 && (
                  <button onClick={() => removeItem(idx)} style={{ width: 32, height: 32, borderRadius: 99, background: '#FFF0F0', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trash2 size={14} color="#FF6B6B" />
                  </button>
                )}
              </div>
            ))}

            {/* Add category */}
            <button
              onClick={addItem}
              style={{ padding: '14px', borderRadius: 16, background: 'white', border: '1.5px dashed var(--border)', color: '#4F8EF7', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Plus size={16} /> 카테고리 추가
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 20px 32px', flexShrink: 0 }}>
          <button
            onClick={handleSave}
            style={{
              width: '100%', height: 52, borderRadius: 16, border: 'none', cursor: 'pointer',
              fontFamily: 'Pretendard', fontSize: 16, fontWeight: 800,
              background: saved ? '#6ED6C8' : 'linear-gradient(135deg, #4F8EF7, #6B5CF0)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.3s',
            }}
          >
            {saved ? <><Check size={18} /> 저장됐어요!</> : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
/* ── 구독 관리 모달 ── */
function SubscriptionManageModal({
  subscriptions,
  onSave,
  onClose,
}: {
  subscriptions: Subscription[]
  onSave: (next: Subscription[]) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<Subscription[]>(subscriptions)
  const [saved, setSaved] = useState(false)

  const updateItem = (idx: number, field: 'name' | 'price' | 'billingDay', value: string) => {
    setItems(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item
        if (field === 'name') {
          const meta = getSubscriptionMeta(value)
          return { ...item, name: value, ...meta }
        }
        if (field === 'price') return { ...item, price: Number(value.replace(/[^0-9]/g, '')) || 0 }
        const day = Number(value.replace(/[^0-9]/g, ''))
        return { ...item, billingDay: Math.min(Math.max(day || 1, 1), 31) }
      })
    )
  }

  const addItem = () => {
    setItems(prev => [...prev, { name: '', price: 0, billingDay: 1, ...getSubscriptionMeta('') }])
  }

  const removeItem = async (idx: number) => {
    const item = items[idx]
    if (item.id) {
      try {
        await deleteSubscription(item.id)
      } catch {
        return
      }
    }
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    const valid = items.filter(i => i.name.trim() !== '')
    try {
      await Promise.all(
        valid.map(item =>
          item.id
            ? updateSubscription(item.id, item.name, item.price, item.billingDay)
            : createSubscription(item.name, item.price, item.billingDay)
        )
      )
      const refreshed = await getSubscriptions()
      onSave(refreshed.map(s => ({ ...s, ...getSubscriptionMeta(s.name) })))
      setSaved(true)
      setTimeout(onClose, 800)
    } catch {
      // 지금 스코프에선 별도 에러 UI 없이 조용히 실패 처리
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: 393, maxHeight: '85%', background: 'var(--background)', borderRadius: '28px 28px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
        </div>

        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--foreground)' }}>구독 관리</h2>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>정기결제 서비스를 등록하고 관리해요</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>여기 등록한 구독은 예산 계산에 자동 반영돼요 — 지출 내역에 따로 안 넣어도 돼요</p>
            </div>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 99, background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color="var(--muted)" />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }} className="no-scrollbar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ background: 'white', borderRadius: 16, padding: '14px 16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    value={item.name}
                    onChange={e => updateItem(idx, 'name', e.target.value)}
                    placeholder="서비스명 (넷플릭스, 왓챠 등)"
                    style={{ flex: 1, background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 14, fontWeight: 600, color: 'var(--foreground)', outline: 'none', fontFamily: 'Pretendard' }}
                  />
                  <button onClick={() => removeItem(idx)} style={{ width: 32, height: 32, borderRadius: 99, background: '#FFF0F0', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trash2 size={14} color="#FF6B6B" />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      value={item.price ? item.price.toLocaleString() : ''}
                      onChange={e => updateItem(idx, 'price', e.target.value)}
                      placeholder="0"
                      style={{ width: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 28px 8px 12px', fontSize: 14, fontWeight: 700, color: 'var(--foreground)', outline: 'none', fontFamily: 'Pretendard', boxSizing: 'border-box', textAlign: 'right' }}
                    />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>원</span>
                  </div>
                  <div style={{ position: 'relative', width: 90 }}>
                    <input
                      value={item.billingDay ? String(item.billingDay) : ''}
                      onChange={e => updateItem(idx, 'billingDay', e.target.value)}
                      placeholder="1~31"
                      style={{ width: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 24px 8px 12px', fontSize: 14, fontWeight: 700, color: 'var(--foreground)', outline: 'none', fontFamily: 'Pretendard', boxSizing: 'border-box', textAlign: 'right' }}
                    />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>일</span>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addItem}
              style={{ padding: '14px', borderRadius: 16, background: 'white', border: '1.5px dashed var(--border)', color: '#4F8EF7', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Plus size={16} /> 구독 추가
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 20px 32px', flexShrink: 0 }}>
          <button
            onClick={handleSave}
            style={{
              width: '100%', height: 52, borderRadius: 16, border: 'none', cursor: 'pointer',
              fontFamily: 'Pretendard', fontSize: 16, fontWeight: 800,
              background: saved ? '#6ED6C8' : 'linear-gradient(135deg, #4F8EF7, #6B5CF0)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.3s',
            }}
          >
            {saved ? <><Check size={18} /> 저장됐어요!</> : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  )
}


interface MyPageScreenProps {
  survivalModeOff: boolean
  onToggleSurvivalMode: () => void
  user: AuthUser | null
  onUserUpdated: (user: AuthUser) => void
  openIntent?: 'survival' | 'subscriptions' | null
  onIntentHandled?: () => void
  onLogout: () => void
}

export default function MyPageScreen({ survivalModeOff, onToggleSurvivalMode, user, onUserUpdated, openIntent, onIntentHandled, onLogout }: MyPageScreenProps) {
  const [showSurvival, setShowSurvival] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [showBudgetEdit, setShowBudgetEdit] = useState(false)
const [showSubManage, setShowSubManage] = useState(false)
  const [comingSoon, setComingSoon] = useState<string | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [savingsMissions, setSavingsMissions] = useState<SavingsMissionResponse | null>(null)

  useEffect(() => {
    getPrediction().then(setPrediction).catch(() => {})
    getSavingsMissions().then(setSavingsMissions).catch(() => {})
  }, [])

  // 홈 화면에서 "생존 모드"/"구독 관리" 카드를 눌러 넘어온 경우, 해당 패널을 자동으로 열어준다.
  useEffect(() => {
    if (openIntent === 'survival') setShowSurvival(true)
    if (openIntent === 'subscriptions') setShowSubManage(true)
    if (openIntent) onIntentHandled?.()
  }, [openIntent, onIntentHandled])

useEffect(() => {
  getSubscriptions()
    .then((list: ApiSubscription[]) => {
      setSubscriptions(list.map(s => ({ ...s, ...getSubscriptionMeta(s.name) })))
    })
    .catch(() => {})
}, [])

  const [totalBudget, setTotalBudget] = useState<number | null>(null)

  useEffect(() => {
    getBudget()
      .then(b => setTotalBudget(b.amount))
      .catch(() => {})
  }, [])

  const totalSub = subscriptions.reduce((s, i) => s + i.price, 0)
  const hasUrgentSubscription = subscriptions.some(s => getNextBillingInfo(s.billingDay).dday <= 7)

  const remainingBudget = prediction?.remainingBudget ?? 0
  const today = new Date()
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysLeft = lastDayOfMonth - today.getDate() + 1
  const dailyLimit = daysLeft > 0 ? Math.floor(remainingBudget / daysLeft) : 0

  return (
    <>
      <div style={{ padding: '0 0 24px', background: 'var(--background)' }}>
        {/* Header */}
        <div style={{ padding: '8px 20px 20px', background: 'white', borderBottom: '1px solid var(--border)' }}>
          <h1 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 800, color: 'var(--foreground)' }}>마이페이지</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #4F8EF7, #6ED6C8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 900 }}>
              {user?.nickname?.[0] ?? '?'}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--foreground)' }}>{user?.nickname ?? '사용자'}</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>{user?.email ?? ''}</p>
            </div>
            <button
              onClick={() => setShowProfileEdit(true)}
              style={{ marginLeft: 'auto', background: '#EBF2FF', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#4F8EF7', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', minHeight: 44 }}
            >
              편집
            </button>
          </div>
        </div>

        {/* Survival Mode */}
        <div style={{ margin: '16px 16px 0' }}>
          <div onClick={() => setShowSurvival(!showSurvival)} style={{ background: '#1A1D27', borderRadius: 22, padding: '20px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showSurvival ? 20 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg, #FFC857, #FF6B6B)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingDown size={18} color="white" strokeWidth={2.5} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>생존 모드</p>
                  <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color: 'white' }}>월말까지 절약 작전 🎯</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ToggleSwithch checked={!survivalModeOff} onChange={onToggleSurvivalMode} />
                <ChevronRight size={18} color="rgba(255,255,255,0.4)" style={{ transform: showSurvival ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
              </div>
            </div>

            {showSurvival && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {([
                    ['남은 예산', `${remainingBudget.toLocaleString()}원`, '#4F8EF7'],
                    ['남은 일수', `${daysLeft}일`, '#6ED6C8'],
                    ['일 한도', `${dailyLimit.toLocaleString()}원`, '#FFC857'],
                  ] as const).map(([l, v, c]) => (
                    <div key={l} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{l}</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: c }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>🎯 AI 절약 미션</p>
                  {!savingsMissions || savingsMissions.missions.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', padding: '4px 0' }}>아직 미션을 만들 데이터가 부족해요</div>
                  ) : savingsMissions.missions.map((m, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', padding: '4px 0', lineHeight: 1.5 }}>
                      • {m.suggestion} (절약 +{m.estimatedSaving.toLocaleString()}원)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Budget Setting */}
        <div style={{ margin: '14px 16px 0', background: 'white', borderRadius: 20, padding: '18px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={18} color="#4F8EF7" />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--foreground)' }}>예산 설정</p>
            </div>
            <button
              onClick={() => setShowBudgetEdit(true)}
              style={{ background: '#EBF2FF', border: 'none', borderRadius: 10, padding: '6px 12px', color: '#4F8EF7', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', minHeight: 44 }}
            >
              수정
            </button>
          </div>
          {[
            ['월 총 예산', totalBudget != null ? `${totalBudget.toLocaleString()}원` : '설정 안 함'],
            ['식비', '200,000원'],
            ['외식', '150,000원'],
            ['교통', '80,000원'],
          ].map(([k, v], i) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>{k}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Subscriptions */}
        <div style={{ margin: '14px 16px 0', background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
          <div style={{ padding: '18px 18px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={18} color="#9B8FFF" />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--foreground)' }}>구독 관리</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>월 예상</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--foreground)' }}>{totalSub.toLocaleString()}원</p>
              </div>
              <button
                onClick={() => setShowSubManage(true)}
                style={{ background: '#EBF2FF', border: 'none', borderRadius: 10, padding: '6px 12px', color: '#4F8EF7', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', minHeight: 44 }}
              >
                관리
              </button>
            </div>
          </div>

          {/* AI recommendation */}
{hasUrgentSubscription && (
  <div style={{ margin: '0 16px 12px', background: '#FFF8E8', borderRadius: 14, padding: '12px 14px', border: '1px solid #FFE4A0', display: 'flex', alignItems: 'center', gap: 10 }}>
    <Zap size={16} color="#FFC857" />
    <p style={{ margin: 0, fontSize: 13, color: '#92400E', fontWeight: 600 }}>결제일이 가까운 구독이 있어요. 미리 확인해보세요!</p>
  </div>
)}

          {/* Subscription list — 사용률 배지 없이 이름 + 다음 결제일만 */}
          {subscriptions.map((s, idx) => {
            const Icon = s.icon
            const { label, dday } = getNextBillingInfo(s.billingDay)
            const isUrgent = dday <= 7
            return (
              <div key={`${s.name}-${idx}`} style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderTop: '1px solid var(--border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 13, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color={s.color} />
                </div>
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>{s.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>{label} 결제</p>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isUrgent ? '#FF6B6B' : 'var(--muted)', background: isUrgent ? '#FFF0F0' : 'transparent', padding: isUrgent ? '1px 6px' : '0', borderRadius: 99 }}>
                      D-{dday}
                    </span>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--foreground)' }}>{s.price.toLocaleString()}원</p>
              </div>
            )
          })}
        </div>

        {/* Menu */}
        <div style={{ margin: '14px 16px 0', background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
          {MENU_ITEMS.map((item, i) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={() => item.label === '로그아웃' ? onLogout() : setComingSoon(item.label)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', padding: '16px 18px',
                  borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Pretendard', minHeight: 56,
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 11, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Icon size={17} color={item.color} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: item.label === '로그아웃' ? '#FF6B6B' : 'var(--foreground)', flex: 1, textAlign: 'left' }}>
                  {item.label}
                </span>
                <ChevronRight size={16} color="var(--muted)" />
              </button>
            )
          })}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 20 }}>SpendMate v1.0.0 · AI 소비 코치</p>
      </div>

      {showProfileEdit && <ProfileEditModal onClose={() => setShowProfileEdit(false)} user={user} onUpdated={onUserUpdated} />}
      {showBudgetEdit && (
        <BudgetEditModal
          totalBudget={totalBudget}
          onClose={() => setShowBudgetEdit(false)}
          onSaved={(amount) => setTotalBudget(amount)}
        />
      )}
      {showSubManage && (
        <SubscriptionManageModal
          subscriptions={subscriptions}
          onSave={setSubscriptions}
          onClose={() => setShowSubManage(false)}
        />
      )}
      {comingSoon && <ComingSoonModal label={comingSoon} onClose={() => setComingSoon(null)} />}
    </>
  )
}

/* ── 아직 구현 안 된 메뉴용 안내 모달 ── */
function ComingSoonModal({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: 393, background: 'var(--background)', borderRadius: '28px 28px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
        </div>
        <div style={{ padding: '24px 20px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>🛠️</p>
          <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: 'var(--foreground)' }}>{label}</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>아직 준비 중인 기능이에요. 곧 만나볼 수 있어요!</p>
          <button
            onClick={onClose}
            style={{ marginTop: 24, width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: 'pointer', background: '#EBF2FF', color: '#4F8EF7', fontSize: 15, fontWeight: 700, fontFamily: 'Pretendard' }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
