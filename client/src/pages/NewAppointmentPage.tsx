import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'  // study: 입력값 검증 규칙 관련 import
import { z } from 'zod'
import { useNavigate } from 'react-router'
import { setRole } from '../lib/session.ts'

const schema = z.object({
  title: z.string().min(1, '약속 제목을 입력해주세요'),
  dateRange: z.string().min(1, '후보 날짜를 입력해주세요'),
  timeRange: z.string().min(1, '만남 가능 시간대를 입력해주세요'),
  deadline: z.string().optional(),
  headcount: z.string().min(1, '전체 인원수를 입력해주세요'),
  creatorName: z.string().min(1, '이름을 입력해주세요'),
  adminPassword: z.string().length(4, '숫자 4자리를 입력해주세요'),
})

type FormValues = z.infer<typeof schema>   // study: 위에서 만든 규칙을 타입으로 뽑아냄.

function NewAppointmentPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })   // study: 해당 규칙으로 검증 및 3가지 요소 return 받음

  const onSubmit = () => {
    // Day1은 화면 전환 확인 단계라 실제 저장 없이 임시 ID(demo)로 이동한다.
    setRole('demo', 'admin')
    navigate('/a/demo', { state: { justCreated: true } })
  }

  return (
    <form className="page-stack" onSubmit={handleSubmit(onSubmit)}>
      <label>
        약속 제목
        <input {...register('title')} placeholder="예) 팀 프로젝트 회의" />
        {errors.title && <p className="field-error">{errors.title.message}</p>}
      </label>
      <label>
        후보 날짜
        <input {...register('dateRange')} placeholder="날짜 범위를 선택하세요" />
        {errors.dateRange && <p className="field-error">{errors.dateRange.message}</p>}
      </label>
      <label>
        만남 가능 시간대
        <input {...register('timeRange')} placeholder="시간대를 선택하세요" />
        {errors.timeRange && <p className="field-error">{errors.timeRange.message}</p>}
      </label>
      <label>
        응답 마감(선택)
        <input {...register('deadline')} placeholder="연도-월-일 --:--" />
      </label>
      <label>
        약속 전체 인원수
        <input {...register('headcount')} placeholder="예) 5명" />
        {errors.headcount && <p className="field-error">{errors.headcount.message}</p>}
      </label>
      <label>
        생성자 이름
        <input {...register('creatorName')} placeholder="이름 입력" />
        {errors.creatorName && <p className="field-error">{errors.creatorName.message}</p>}
      </label>
      <label>
        관리자 비밀번호
        <input type="password" {...register('adminPassword')} placeholder="숫자 4자리" />
        {errors.adminPassword && <p className="field-error">{errors.adminPassword.message}</p>}
      </label>
      <button type="submit">약속 만들기</button>
    </form>
  )
}

export default NewAppointmentPage
