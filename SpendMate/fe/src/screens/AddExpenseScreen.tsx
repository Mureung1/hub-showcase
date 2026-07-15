import { useState, useRef, useEffect } from 'react'
import { X, Camera, Image, PenLine, ChevronRight, Check, Coffee, ShoppingCart, Utensils, Car, Package, Zap, Upload, Plus, Trash2, AlertCircle } from 'lucide-react'
import { uploadReceipt, confirmReceipt, createManualExpense, type UploadResult, type ExpenseDraft } from '../lib/api'

type Step = 'method' | 'upload-receipt' | 'upload-capture' | 'form' | 'ocr' | 'result'
type SourceType = 'PAPER_RECEIPT' | 'ORDER_SCREEN'

// fe 카테고리 라벨 ↔ 백엔드 Category enum 매핑. 이름이 1:1로 안 맞아서
// (docs/design.md 카테고리 컬러 매핑 참고) 대응이 없는 건 OTHER로 보낸다.
const BASE_CATEGORIES = [
  { name: '외식', icon: Utensils, color: '#4F8EF7', bg: '#EBF2FF', backendCategory: 'OTHER' },
  { name: '카페', icon: Coffee, color: '#6F4E37', bg: '#FFF3E0', backendCategory: 'CAFE' },
  { name: '식료품', icon: ShoppingCart, color: '#FF6B6B', bg: '#FFF0F0', backendCategory: 'MART' },
  { name: '편의점', icon: Package, color: '#9B8FFF', bg: '#F0EFFF', backendCategory: 'CONVENIENCE_STORE' },
  { name: '교통', icon: Car, color: '#FFC857', bg: '#FFF8E8', backendCategory: 'OTHER' },
  { name: '구독', icon: Zap, color: '#6ED6C8', bg: '#E8F8F6', backendCategory: 'OTHER' },
]

// 백엔드 Category enum → 뱃지 표시용 (OCR 분석 결과에 자동분류된 카테고리를 보여줄 때 사용)
const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  CONVENIENCE_STORE: { label: '편의점', color: '#4F8EF7', bg: '#EBF2FF' },
  CAFE: { label: '카페', color: '#6F4E37', bg: '#FFF3E0' },
  SHOPPING: { label: '쇼핑', color: '#9B8FFF', bg: '#F0EFFF' },
  MART: { label: '마트', color: '#FF6B6B', bg: '#FFF0F0' },
  DELIVERY: { label: '배달', color: '#00C4B3', bg: '#E8F8F6' },
  MEAL_KIT: { label: '밀키트', color: '#F2884B', bg: '#FDECE1' },
  CAMPUS_MEAL: { label: '학식', color: '#5FBF7A', bg: '#EAF7EE' },
  OTHER: { label: '기타', color: '#6B7280', bg: '#F3F4F6' },
}

/* ── 업로드 화면 (영수증 / 주문내역 공용) ── */
function ImageUploadStep({
  type,
  onNext,
  onBack,
}: {
  type: 'receipt' | 'capture'
  onNext: (file: File) => void
  onBack: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isReceipt = type === 'receipt'
  const title = isReceipt ? '영수증 사진 추가' : '주문내역 캡처 추가'
  const desc = isReceipt
    ? '영수증이 잘 보이도록 평평하게 펴서 촬영해주세요'
    : '배달앱·쇼핑앱의 주문 완료 화면을 캡처해주세요'

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 20px 24px' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: 'var(--border)', border: 'none', borderRadius: 99, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronRight size={16} color="var(--muted)" style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--foreground)' }}>{title}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>{desc}</p>
        </div>
      </div>

      {/* Upload area */}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

      {preview ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ flex: 1, borderRadius: 20, overflow: 'hidden', background: '#F3F4F6', position: 'relative', minHeight: 280 }}>
            <img src={preview} alt="업로드 이미지" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            <button
              onClick={() => setPreview(null)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 99, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Trash2 size={14} color="white" />
            </button>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            style={{ padding: '12px', borderRadius: 14, background: 'var(--background)', border: '1.5px dashed var(--border)', color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Pretendard' }}
          >
            다시 선택
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            flex: 1, minHeight: 240, borderRadius: 20, border: '2px dashed #D1D5DB',
            background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 16, cursor: 'pointer', fontFamily: 'Pretendard',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg, #EBF2FF, #E8F8F6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isReceipt ? <Camera size={32} color="#4F8EF7" /> : <Image size={32} color="#6ED6C8" />}
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>
              {isReceipt ? '사진 촬영 또는 선택' : '스크린샷 선택'}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              갤러리에서 선택하거나 카메라로 촬영하세요
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 99, background: '#EBF2FF' }}>
            <Upload size={14} color="#4F8EF7" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4F8EF7' }}>이미지 불러오기</span>
          </div>
        </button>
      )}

      {/* Tips */}
      <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 14, background: '#FFF8E8', border: '1px solid #FFE4A0' }}>
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#92400E' }}>📌 인식률을 높이려면</p>
        {(isReceipt
          ? ['글자가 선명하게 보이도록 촬영해주세요', '빛 반사가 없는 곳에서 찍으면 정확해요', '영수증 전체가 프레임 안에 들어오도록 해주세요']
          : ['주문 금액이 잘 보이는 화면을 캡처해주세요', '상품명·가격이 모두 보이면 더 정확해요', 'GS25, 배민, 쿠팡 등 대부분의 앱을 지원해요']
        ).map((t, i) => (
          <p key={i} style={{ margin: 0, fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>• {t}</p>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => (file ? onNext(file) : fileRef.current?.click())}
        disabled={false}
        style={{
          marginTop: 16, height: 52, borderRadius: 16, border: 'none', cursor: 'pointer',
          fontFamily: 'Pretendard', fontSize: 16, fontWeight: 800,
          background: preview ? 'linear-gradient(135deg, #4F8EF7, #6B5CF0)' : '#E5E7EB',
          color: preview ? 'white' : '#9CA3AF',
          transition: 'background 0.2s',
        }}
      >
        {preview ? 'AI 분석 시작하기 →' : '이미지를 먼저 선택해주세요'}
      </button>
    </div>
  )
}

/* ── 직접 입력 (F12, 영수증 없는 지출) ── */
function FormStep({ onDone, errorMessage }: { onDone: () => void; errorMessage?: string | null }) {
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedCat, setSelectedCat] = useState(0)
  const [categories, setCategories] = useState(BASE_CATEGORIES)
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const addCategory = () => {
    if (!newCatName.trim()) return
    setCategories(prev => [...prev, { name: newCatName.trim(), icon: Package, color: '#6B7280', bg: '#F3F4F6', backendCategory: 'OTHER' }])
    setSelectedCat(categories.length)
    setNewCatName('')
    setShowAddCat(false)
  }

  const handleSave = async () => {
    if (!amount) return
    setSaving(true)
    setSaveError(null)
    try {
      await createManualExpense(Number(amount), categories[selectedCat].backendCategory, memo, `${date}T00:00:00`)
      onDone()
    } catch {
      setSaveError('저장에 실패했어요. 다시 시도해주세요.')
      setSaving(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px', overflowY: 'auto' }} className="no-scrollbar">
      <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 900, color: 'var(--foreground)' }}>직접 입력</h2>

      {(errorMessage || saveError) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF0F0', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
          <AlertCircle size={16} color="#FF6B6B" />
          <span style={{ fontSize: 13, color: '#FF6B6B' }}>{errorMessage || saveError}</span>
        </div>
      )}

      {/* Amount */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>금액</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <input
            value={amount ? Number(amount).toLocaleString() : ''}
            onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0"
            style={{ border: 'none', outline: 'none', fontSize: 40, fontWeight: 900, color: 'var(--foreground)', textAlign: 'right', background: 'transparent', fontFamily: 'Pretendard', width: '60%' }}
          />
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--foreground)' }}>원</span>
        </div>
        <div style={{ height: 2, background: '#4F8EF7', maxWidth: 200, margin: '8px auto 0', borderRadius: 99 }} />
      </div>

      {/* Category */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>카테고리</p>
        <button
          onClick={() => setShowAddCat(!showAddCat)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#4F8EF7', fontSize: 13, fontWeight: 600, fontFamily: 'Pretendard' }}
        >
          <Plus size={14} /> 추가
        </button>
      </div>

      {/* Add category input */}
      {showAddCat && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <input
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="카테고리명 입력"
            autoFocus
            style={{ flex: 1, background: 'white', border: '1.5px solid #4F8EF7', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: 'var(--foreground)', outline: 'none', fontFamily: 'Pretendard' }}
          />
          <button
            onClick={addCategory}
            style={{ height: 42, paddingInline: 14, borderRadius: 12, background: '#4F8EF7', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard', whiteSpace: 'nowrap' }}
          >
            추가
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {categories.map((c, i) => {
          const Icon = c.icon
          return (
            <button
              key={c.name}
              onClick={() => setSelectedCat(i)}
              style={{
                background: selectedCat === i ? c.bg : 'white',
                border: `2px solid ${selectedCat === i ? c.color : 'var(--border)'}`,
                borderRadius: 14, padding: '12px 0', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'Pretendard',
                transition: 'all 0.15s', minHeight: 44,
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 12, background: selectedCat === i ? c.bg : 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={selectedCat === i ? c.color : '#9CA3AF'} />
              </div>
              <span style={{ fontSize: 12, fontWeight: selectedCat === i ? 700 : 500, color: selectedCat === i ? c.color : 'var(--muted)' }}>{c.name}</span>
            </button>
          )
        })}
      </div>

      {/* Date */}
      <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>날짜</p>
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', fontSize: 14, color: 'var(--foreground)', outline: 'none', fontFamily: 'Pretendard', marginBottom: 20 }}
      />

      {/* Memo */}
      <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>메모 (선택)</p>
      <input
        value={memo}
        onChange={e => setMemo(e.target.value)}
        placeholder="어디서 뭘 샀는지 기록해요"
        style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', fontSize: 14, color: 'var(--foreground)', outline: 'none', fontFamily: 'Pretendard', marginBottom: 20 }}
      />

      <button
        onClick={handleSave}
        disabled={!amount || saving}
        style={{
          height: 52, borderRadius: 16, border: 'none', fontFamily: 'Pretendard', fontSize: 16, fontWeight: 800, cursor: amount && !saving ? 'pointer' : 'default',
          background: amount ? 'linear-gradient(135deg, #4F8EF7, #6B5CF0)' : '#E5E7EB',
          color: amount ? 'white' : '#9CA3AF',
        }}
      >
        {saving ? '저장 중...' : '저장하기'}
      </button>
    </div>
  )
}

/* ── 메서드 선택 ── */
function MethodStep({ onSelect }: { onSelect: (m: 'upload-receipt' | 'upload-capture' | 'form') => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900, color: 'var(--foreground)' }}>지출 등록</h2>
      <p style={{ margin: '0 0 28px', fontSize: 14, color: 'var(--muted)' }}>어떤 방법으로 등록할까요?</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[
          { method: 'upload-receipt' as const, icon: Camera, grad: 'linear-gradient(135deg, #4F8EF7, #6B5CF0)', title: '영수증 촬영', desc: 'AI가 영수증을 자동으로 분석해드려요' },
          { method: 'upload-capture' as const, icon: Image, grad: 'linear-gradient(135deg, #6ED6C8, #4F8EF7)', title: '주문내역 캡처', desc: '배달앱·쇼핑 캡처 업로드' },
          { method: 'form' as const, icon: PenLine, grad: 'linear-gradient(135deg, #FFC857, #FF9500)', title: '직접 입력', desc: '금액·카테고리 직접 입력' },
        ].map(({ method, icon: Icon, grad, title, desc }) => (
          <button
            key={method}
            onClick={() => onSelect(method)}
            style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 20, padding: '20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'left', fontFamily: 'Pretendard', minHeight: 44 }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 16, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={24} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--foreground)' }}>{title}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>{desc}</p>
            </div>
            <ChevronRight size={18} color="var(--muted)" />
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── OCR 로딩 (실제 업로드 API 호출) ── */
function OcrStep({
  file,
  sourceType,
  onDone,
  onError,
}: {
  file: File
  sourceType: SourceType
  onDone: (result: UploadResult) => void
  onError: (message: string) => void
}) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let cancelled = false

    const tick = setInterval(() => {
      setProgress(prev => (prev < 3 ? prev + 1 : prev))
    }, 900)

    uploadReceipt(file, sourceType)
      .then(result => {
        if (cancelled) return
        clearInterval(tick)
        setProgress(4)
        setTimeout(() => {
          if (cancelled) return
          if (result.ocrStatus === 'FAILED') {
            onError('영수증을 인식하지 못했어요. 직접 입력해주세요.')
          } else {
            onDone(result)
          }
        }, 400)
      })
      .catch(() => {
        if (cancelled) return
        clearInterval(tick)
        onError('업로드 중 오류가 발생했어요. 다시 시도해주세요.')
      })

    return () => {
      cancelled = true
      clearInterval(tick)
    }
  }, [file, sourceType])

  const steps = ['이미지 업로드 완료', '영수증 텍스트 인식 중', 'AI 소비 분석 중', '저장 준비 중']

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 32px', gap: 28 }}>
      <div style={{
        width: 84, height: 84, borderRadius: 26,
        background: 'linear-gradient(135deg, #4F8EF7, #6ED6C8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(79,142,247,0.35)',
        animation: 'pulse-ring 1.5s infinite',
      }}>
        <Camera size={36} color="white" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: 'var(--foreground)' }}>영수증을 분석하고 있습니다</h2>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>예상 소요시간 약 5초</p>
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'white', borderRadius: 14, border: `1.5px solid ${progress > i ? '#4F8EF7' : 'var(--border)'}`, transition: 'border-color 0.3s, background 0.3s', boxShadow: progress > i ? '0 2px 8px rgba(79,142,247,0.12)' : 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: 99, background: progress > i ? '#4F8EF7' : 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s', flexShrink: 0 }}>
              {progress > i
                ? <Check size={14} color="white" />
                : progress === i
                  ? <div style={{ width: 14, height: 14, borderRadius: 99, border: '2px solid #4F8EF7', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                  : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{i + 1}</span>
              }
            </div>
            <span style={{ fontSize: 14, fontWeight: progress > i ? 700 : 500, color: progress > i ? '#4F8EF7' : 'var(--muted)', transition: 'color 0.3s' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 분석 결과 (실제 파싱값, 저장하기 눌러야 진짜 저장됨) ── */
function ResultStep({ result, onClose }: { result: UploadResult; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [items, setItems] = useState<ExpenseDraft[]>(result.items)
  const total = items.reduce((sum, item) => sum + item.amount, 0)

  const updateItem = (idx: number, field: 'name' | 'amount', value: string) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      if (field === 'amount') {
        return { ...item, amount: Number(value.replace(/[^0-9-]/g, '')) || 0 }
      }
      return { ...item, name: value }
    }))
  }

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const addItem = () => {
    setItems(prev => [...prev, { name: '', amount: 0, category: 'OTHER' }])
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await confirmReceipt(result.receiptId, items, result.spentAt)
      onClose()
    } catch {
      setSaveError('저장에 실패했어요. 다시 시도해주세요.')
      setSaving(false)
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }} className="no-scrollbar">
      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: 'var(--foreground)' }}>분석 결과</h2>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--muted)' }}>
        {result.storeName ? `${result.storeName} 구매 내역이에요` : '구매 내역을 확인해주세요'} · 잘못 인식됐으면 눌러서 고쳐주세요
      </p>

      <div style={{ background: 'white', borderRadius: 20, padding: '18px', marginBottom: 14, border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>OCR 인식 결과</p>
        {items.map((item, i) => {
          const meta = CATEGORY_META[item.category] ?? CATEGORY_META.OTHER
          return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, borderRadius: 99, padding: '4px 8px' }}>
              {meta.label}
            </span>
            <input
              value={item.name}
              onChange={e => updateItem(i, 'name', e.target.value)}
              placeholder="품목명"
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: 14, color: 'var(--foreground)', background: 'transparent', fontFamily: 'Pretendard' }}
            />
            <input
              value={item.amount === 0 ? '' : item.amount.toLocaleString()}
              onChange={e => updateItem(i, 'amount', e.target.value)}
              placeholder="0"
              style={{ width: 84, border: 'none', outline: 'none', fontSize: 14, fontWeight: 600, textAlign: 'right', color: item.amount < 0 ? '#FF6B6B' : 'var(--foreground)', background: 'transparent', fontFamily: 'Pretendard' }}
            />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>원</span>
            <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--muted)' }}>
              <Trash2 size={14} />
            </button>
          </div>
          )
        })}

        <button
          onClick={addItem}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#4F8EF7', fontSize: 13, fontWeight: 600, fontFamily: 'Pretendard', padding: '10px 0 0' }}
        >
          <Plus size={14} /> 항목 추가
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 4, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>합계</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--foreground)' }}>{total.toLocaleString()}원</span>
        </div>
      </div>

      {saveError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF0F0', borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
          <AlertCircle size={16} color="#FF6B6B" />
          <span style={{ fontSize: 13, color: '#FF6B6B' }}>{saveError}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} disabled={saving} style={{ flex: 1, height: 52, borderRadius: 14, background: 'var(--background)', border: '1.5px solid var(--border)', color: 'var(--muted)', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Pretendard' }}>
          취소
        </button>
        <button onClick={handleSave} disabled={saving} style={{ flex: 2, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #4F8EF7, #6B5CF0)', border: 'none', color: 'white', fontSize: 15, fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'Pretendard' }}>
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  )
}

/* ── Main Modal ── */
export default function AddExpenseScreen({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('method')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [sourceType, setSourceType] = useState<SourceType>('PAPER_RECEIPT')
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [ocrErrorMessage, setOcrErrorMessage] = useState<string | null>(null)

  const handleUploadNext = (selectedFile: File, type: 'receipt' | 'capture') => {
    setPendingFile(selectedFile)
    setSourceType(type === 'receipt' ? 'PAPER_RECEIPT' : 'ORDER_SCREEN')
    setStep('ocr')
  }

  const handleOcrError = (message: string) => {
    setOcrErrorMessage(message)
    setStep('form')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width: 393, maxHeight: 700,
        background: 'var(--background)', borderRadius: 32, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
      }}>
        {/* Handle + Close */}
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', width: 32, height: 32, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} color="var(--muted)" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="no-scrollbar">
          {step === 'method' && <MethodStep onSelect={setStep} />}
          {step === 'upload-receipt' && (
            <ImageUploadStep type="receipt" onNext={(f) => handleUploadNext(f, 'receipt')} onBack={() => setStep('method')} />
          )}
          {step === 'upload-capture' && (
            <ImageUploadStep type="capture" onNext={(f) => handleUploadNext(f, 'capture')} onBack={() => setStep('method')} />
          )}
          {step === 'form' && <FormStep onDone={onClose} errorMessage={ocrErrorMessage} />}
          {step === 'ocr' && pendingFile && (
            <OcrStep
              file={pendingFile}
              sourceType={sourceType}
              onDone={(result) => { setUploadResult(result); setStep('result') }}
              onError={handleOcrError}
            />
          )}
          {step === 'result' && uploadResult && <ResultStep result={uploadResult} onClose={onClose} />}
        </div>
      </div>
    </div>
  )
}
