import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthState } from '@/hooks/useAuth'
import { createCustomer, findCustomerByPhone } from '@/services/customers'
import { isValidPhone } from '@/utils/phone'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { toast } from 'sonner'

const customerSchema = z.object({
  name: z.string().min(2, '이름은 2 자 이상입니다').max(100, '이름은 100자 이하여야 합니다'),
  phone: z.string().refine((val) => isValidPhone(val), '전화번호 형식이 아닙니다'),
})

type CustomerForm = z.infer<typeof customerSchema>

interface ExistingCustomer {
  id: string
  name: string
  phoneMasked: string
}

const NewCustomer = () => {
  const navigate = useNavigate()
  const { user } = useAuthState()
  const [isLoading, setIsLoading] = useState(false)
  const [existingCustomer, setExistingCustomer] = useState<ExistingCustomer | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
  })

  // 원본 번호 비교는 서비스 레이어 내부에서만 하고 화면에는 마스킹 결과만 반환한다.
  const checkDuplicate = async (phone: string): Promise<ExistingCustomer | null> => {
    if (!user) return null
    const match = await findCustomerByPhone(user.uid, phone)
    return match
      ? { id: match.id, name: match.name, phoneMasked: match.phoneMasked }
      : null
  }

  const onSubmit = async (data: CustomerForm) => {
    if (!user) {
      toast.error('로그인이 필요합니다')
      return
    }

    // 중복 확인 — await 결과를 직접 사용 (state 의존 제거)
    const existing = await checkDuplicate(data.phone)
    if (existing) {
      setExistingCustomer(existing)
      return
    }
    setExistingCustomer(null)

    setIsLoading(true)
    try {
      const customerId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      await createCustomer(user.uid, customerId, {
        name: data.name,
        phone: data.phone,
      })
      toast.success('고객이 등록되었습니다')
      navigate('/app/customers')
    } catch (error) {
      toast.error('고객 등록 실패: ' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseModal = () => {
    setExistingCustomer(null)
  }

  const handleGoToDetail = () => {
    if (existingCustomer) {
      navigate(`/app/customers/${existingCustomer.id}`)
    }
  }

  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">신규 고객 등록</h1>
        <p className="text-sm text-gray-500 mt-1">고객 정보를 입력하세요</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="이름"
          type="text"
          placeholder="홍길동"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="전화번호"
          type="tel"
          placeholder="010-1234-5678"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={() => navigate('/app/customers')}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? '등록 중...' : '등록'}
          </Button>
        </div>
      </form>

      {/* 중복 고객 모달 */}
      <Modal
        isOpen={!!existingCustomer}
        onClose={handleCloseModal}
        title="이미 등록된 고객입니다"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseModal} fullWidth>
              닫기
            </Button>
            <Button variant="primary" onClick={handleGoToDetail} fullWidth>
              고객 상세 보기
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-gray-700">
            <span className="font-semibold">{existingCustomer?.name}</span> 님은 이미 등록된 고객입니다.
          </p>
          <p className="text-gray-600">전화번호: {existingCustomer?.phoneMasked}</p>
        </div>
      </Modal>
    </div>
  )
}

export default NewCustomer
