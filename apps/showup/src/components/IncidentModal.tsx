import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { toast } from 'sonner'

const incidentSchema = z.object({
  type: z.enum(['abuse', 'dispute', 'late', 'unreasonable']),
  memo: z.string().min(1, '사실 메모를 입력해주세요'),
  occurredAt: z.string().min(1, '발생일을 선택해주세요'),
})

type IncidentForm = z.infer<typeof incidentSchema>

interface IncidentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: IncidentForm) => Promise<void>
}

const IncidentModal = ({ isOpen, onClose, onSubmit }: IncidentModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<IncidentForm>({
    resolver: zodResolver(incidentSchema),
  })

  const handleFormSubmit = async (data: IncidentForm) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      reset()
      onClose()
      toast.success('사건이 기록되었습니다')
    } catch (error) {
      toast.error('사건 기록 실패: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const INCIDENT_TYPES = [
    { value: 'abuse', label: '폭언·무례', description: '고함, 욕설, 위협적인 언행' },
    { value: 'dispute', label: '환불·결제 분쟁', description: '결제, 환불 관련 갈등' },
    { value: 'late', label: '상습 지각', description: '30 분 이상 지각 반복' },
    { value: 'unreasonable', label: '무리한 요구', description: '과도한 요구 반복' },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="사건 기록"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? '기록 중...' : '기록'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* 카테고리 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            사건 카테고리
          </label>
          <div className="space-y-2">
            {INCIDENT_TYPES.map((type) => (
              <label
                key={type.value}
                className="flex items-start gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  value={type.value}
                  {...register('type')}
                  className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="font-medium text-gray-900">{type.label}</p>
                  <p className="text-xs text-gray-500">{type.description}</p>
                </div>
              </label>
            ))}
          </div>
          {errors.type && (
            <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
          )}
        </div>

        {/* 발생일 */}
        <div>
          <label htmlFor="occurredAt" className="block text-sm font-medium text-gray-700 mb-1">
            발생일
          </label>
          <input
            type="date"
            id="occurredAt"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...register('occurredAt')}
          />
          {errors.occurredAt && (
            <p className="mt-1 text-sm text-red-600">{errors.occurredAt.message}</p>
          )}
        </div>

        {/* 사실 메모 */}
        <div>
          <label htmlFor="memo" className="block text-sm font-medium text-gray-700 mb-1">
            사실 메모
          </label>
          <textarea
            id="memo"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="사실만 기록해주세요. 추측이나 감정은 제외하세요."
            {...register('memo')}
          />
          {errors.memo && (
            <p className="mt-1 text-sm text-red-600">{errors.memo.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3l9 16H3L12 3z" /></svg>
              허위 기록 시 법적 책임이 발생할 수 있습니다.
            </span>
          </p>
        </div>
      </form>
    </Modal>
  )
}

export default IncidentModal
