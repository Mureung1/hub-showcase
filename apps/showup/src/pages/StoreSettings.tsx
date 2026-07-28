import { useState, useEffect } from 'react'
import { useAuthState } from '@/hooks/useAuth'
import { getStore, updateStore } from '@/services/stores'
import { getCurrentUser } from '@/services/auth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { toast } from 'sonner'
import type { Store } from '@/types/schema'
import Icon from '@/components/ui/Icon'

const StoreSettings = () => {
  const { user } = useAuthState()
  const [store, setStore] = useState<Store | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [storeName, setStoreName] = useState('')
  const [storeCategory, setStoreCategory] = useState('')

  const CATEGORIES = [
    { value: 'cafe', label: '카페' },
    { value: 'restaurant', label: '식당' },
    { value: 'beauty', label: '미용실' },
    { value: 'studio', label: '공방' },
    { value: 'academy', label: '학원' },
    { value: 'etc', label: '기타' },
  ]

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }
      setError(null)
      try {
        const storeData = await getStore(user.uid)
        setStore(storeData)
        if (storeData) {
          setStoreName(storeData.name)
          setStoreCategory(storeData.category)
        }
      } catch (err) {
        console.error('Failed to load store:', err)
        setError('가게 정보를 불러오지 못했습니다')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user])

  const handleSave = async () => {
    if (!user) return
    if (storeName.trim().length < 2) {
      toast.error('가게 이름은 2자 이상이어야 합니다')
      return
    }
    setIsSaving(true)
    try {
      await updateStore(user.uid, {
        name: storeName.trim(),
        category: storeCategory,
      })
      toast.success('가게 정보가 수정되었습니다')
    } catch (err) {
      toast.error('수정 실패: ' + (err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>로딩 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600 mb-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-blue-600 hover:underline"
        >
          다시 시도
        </button>
      </div>
    )
  }

  const currentUser = getCurrentUser()
  const categoryLabel = CATEGORIES.find((c) => c.value === storeCategory)?.label || storeCategory

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-7 border-b border-slate-300 pb-6">
        <h1 className="text-2xl font-bold text-gray-900">내 정보</h1>
        <p className="text-sm text-gray-500 mt-1">가게 정보를 확인하고 수정합니다</p>
      </header>

      {/* 현재 설정 요약 (상단) */}
      <section className="mb-6 rounded-xl border border-slate-300 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Icon name="dashboard" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">현재 설정</h2>
            <p className="mt-1 text-sm text-slate-500">현재 매장에 적용된 기본 정보를 확인하세요.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">가게 이름</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{storeName || '-'}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">업종</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{categoryLabel}</p>
          </div>
        </div>
      </section>

      {/* 가게 정보 (수정 가능) */}
      <section className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">가게 정보 수정</h2>
        <div className="space-y-4">
          <Input
            label="가게 이름"
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="가게 이름"
          />

          <div>
            <label htmlFor="storeCategory" className="block text-sm font-medium text-gray-700 mb-1">
              업종
            </label>
            <select
              id="storeCategory"
              value={storeCategory}
              onChange={(e) => setStoreCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            variant="primary"
            fullWidth
            disabled={isSaving || (storeName.trim() === store?.name && storeCategory === store?.category)}
            onClick={handleSave}
          >
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </section>

      {/* 계정 정보 (읽기 전용) */}
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">계정 정보</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">이메일</span>
            <span className="text-gray-900 font-medium">{currentUser?.email || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">가입일</span>
            <span className="text-gray-900 font-medium">
              {store?.createdAt
                ? new Date(
                    typeof store.createdAt === 'object' && 'toDate' in store.createdAt
                      ? (store.createdAt as { toDate: () => Date }).toDate()
                      : store.createdAt as unknown as Date
                  ).toLocaleDateString('ko-KR')
                : '-'}
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default StoreSettings
