import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthState } from '@/hooks/useAuth'
import { getCustomer, searchCustomers } from '@/services/customers'
import { createReservationAndRefresh } from '@/services/riskRefresh'
import type { CustomerSearchResult } from '@/types/schema'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { toast } from 'sonner'

const reservationSchema = z.object({
  customerId: z.string().min(1, '고객을 선택해주세요'),
  date: z.string().min(1, '날짜를 선택해주세요'),
  time: z.string().min(1, '시간을 선택해주세요'),
  memo: z.string().optional(),
})

type ReservationForm = z.infer<typeof reservationSchema>

const NewReservation = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthState()
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ReservationForm>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      memo: '',
    },
  })

  useEffect(() => {
    const customerId = searchParams.get('customerId')
    if (!user || !customerId) return

    const loadCustomer = async () => {
      try {
        const customer = await getCustomer(user.uid, customerId)
        if (!customer) {
          toast.error('고객을 찾을 수 없습니다')
          return
        }
        setSelectedCustomer(customer)
        setValue('customerId', customer.id)
      } catch (error) {
        console.error('Failed to load selected customer:', error)
        toast.error('고객 정보를 불러오지 못했습니다')
      }
    }

    loadCustomer()
  }, [searchParams, setValue, user])

  // 고객 검색 (300ms debounce)
  const handleSearch = async (query: string) => {
    if (!user || !query.trim()) {
      setSearchResults([])
      return
    }

    try {
      const results = await searchCustomers(user.uid, query)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    }
  }

  const handleSelectCustomer = (customer: CustomerSearchResult) => {
    setSelectedCustomer(customer)
    setValue('customerId', customer.id)
    setIsCustomerModalOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const onSubmit = async (data: ReservationForm) => {
    if (!user) {
      toast.error('로그인이 필요합니다')
      return
    }

    if (!selectedCustomer) {
      toast.error('고객을 선택해주세요')
      return
    }

    setIsLoading(true)
    try {
      const resId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      await createReservationAndRefresh(user.uid, data.customerId, resId, {
        customerId: data.customerId,
        date: data.date,
        time: data.time,
        memo: data.memo,
      })
      toast.success('예약이 생성되었습니다')
      navigate('/app/reservations')
    } catch (error) {
      toast.error('예약 생성 실패: ' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">새 예약</h1>
        <p className="text-sm text-gray-500 mt-1">고객을 선택하고 예약 정보를 입력하세요</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* 고객 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">고객</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-left hover:bg-gray-50 transition-colors"
            >
              {selectedCustomer ? (
                <div>
                  <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-500">{selectedCustomer.phoneMasked}</p>
                </div>
              ) : (
                <p className="text-gray-400">고객 검색하기</p>
              )}
            </button>
          </div>
          {errors.customerId && (
            <p className="mt-1 text-sm text-red-600">{errors.customerId.message}</p>
          )}
        </div>

        {/* 날짜 */}
        <Input
          label="날짜"
          type="date"
          error={errors.date?.message}
          {...register('date')}
        />

        {/* 시간 */}
        <Input
          label="시간"
          type="time"
          error={errors.time?.message}
          {...register('time')}
        />

        {/* 메모 */}
        <div>
          <label htmlFor="memo" className="block text-sm font-medium text-gray-700 mb-1">
            메모 (선택사항)
          </label>
          <textarea
            id="memo"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register('memo')}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={() => navigate('/app/reservations')}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? '등록 중...' : '예약 생성'}
          </Button>
        </div>
      </form>

      {/* 고객 검색 모달 */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false)
          setSearchQuery('')
          setSearchResults([])
        }}
        title="고객 검색"
      >
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="전화번호 뒤 4 자리 또는 이름"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              handleSearch(e.target.value)
            }}
          />

          <div className="max-h-60 overflow-y-auto space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                검색어를 입력하세요
              </p>
            ) : (
              searchResults.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">{customer.name}</p>
                  <p className="text-sm text-gray-500">{customer.phoneMasked}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default NewReservation
