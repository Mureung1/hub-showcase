import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { profileApi } from '../utils/apiClient'

// Form schema (프론트엔드 폼 검증)
const ProfileSchema = z.object({
  major: z.string().min(1, '전공을 선택해주세요'),
  grade: z.string().min(1, '학년을 선택해주세요'),
  enrollmentStatus: z.string().min(1, '재학 상태를 선택해주세요'),
  residenceRegion: z.string().min(1, '거주지를 선택해주세요'),
  incomeBracket: z.string().optional(),
  age: z.string().optional(),
  interestTags: z.array(z.string()).default([]),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: '개인정보 수집에 동의해주세요'
  }),
})

type ProfileFormData = z.infer<typeof ProfileSchema>

interface ProfileSubmitData {
  major: string
  grade: number
  enrollmentStatus: string
  residenceRegion: string
  incomeBracket?: number
  age?: number
  interestTags: string[]
}

const MAJORS = [
  { value: 'HUMANITIES', label: '인문' },
  { value: 'BUSINESS', label: '경영/경제' },
  { value: 'EDUCATION', label: '교육' },
  { value: 'SCIENCE', label: '과학/공학' },
  { value: 'IT', label: 'IT/컴퓨터' },
  { value: 'MEDICINE', label: '의학/간호' },
  { value: 'ARTS', label: '예술/음악' },
  { value: 'OTHER', label: '기타' },
]

const GRADES = [
  { value: '1', label: '1학년' },
  { value: '2', label: '2학년' },
  { value: '3', label: '3학년' },
  { value: '4', label: '4학년' },
]

const ENROLLMENT_STATUS = [
  { value: '재학', label: '재학' },
  { value: '휴학', label: '휴학' },
  { value: '졸업예정', label: '졸업예정' },
]

const REGIONS = [
  { value: 'SEOUL', label: '서울' },
  { value: 'GYEONGGI', label: '경기' },
  { value: 'INCHEON', label: '인천' },
  { value: 'BUSAN', label: '부산' },
  { value: 'DAEGU', label: '대구' },
  { value: 'GWANGJU', label: '광주' },
  { value: 'DAEJEON', label: '대전' },
  { value: 'ULSAN', label: '울산' },
  { value: 'GANGWON', label: '강원' },
  { value: 'CHUNGCHEONG', label: '충청' },
  { value: 'JEOLLA', label: '전라' },
  { value: 'GYEONGSAN', label: '경상' },
  { value: 'JEJU', label: '제주' },
]

const INTEREST_TAGS = [
  '공모전', '대외활동', '봉사', '장학금', '인턴', '창업', '교내행사'
]

export default function ProfileSetup() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { control, handleSubmit, formState: { errors }, watch } = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      interestTags: [],
      agreeToTerms: false,
    },
  })

  const interestTags = watch('interestTags')

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const submitData: ProfileSubmitData = {
        major: data.major,
        grade: parseInt(data.grade),
        enrollmentStatus: data.enrollmentStatus,
        residenceRegion: data.residenceRegion,
        incomeBracket: data.incomeBracket ? parseInt(data.incomeBracket) : undefined,
        age: data.age ? parseInt(data.age) : undefined,
        interestTags: data.interestTags,
      }

      const response = await profileApi.create(submitData)

      if (response.data || response.success) {
        // 프로필 생성 성공
        alert('프로필이 저장되었습니다!')
        // 대시보드로 이동 (추후 구현)
        // navigate('/dashboard')
      }
    } catch (error: any) {
      console.error('프로필 저장 실패:', error)
      setErrorMessage(error.message || '프로필 저장에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTag = (tag: string) => {
    const current = interestTags || []
    if (current.includes(tag)) {
      return current.filter(t => t !== tag)
    }
    return [...current, tag]
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-text-primary mb-2">프로필 설정</h1>
          <p className="text-md text-text-secondary">
            개인화된 정보 추천을 위해 프로필을 설정해주세요
          </p>
        </div>

        {/* 에러 메시지 */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2 text-danger text-sm">
            {errorMessage}
          </div>
        )}

        {/* 폼 */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-bg-primary rounded-2xl p-8 shadow-sm">
          {/* 학과/전공 */}
          <div className="mb-6">
            <label className="block text-md font-semibold text-text-primary mb-3">
              학과/전공 <span className="text-danger">*</span>
            </label>
            <Controller
              name="major"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className={`w-full px-4 py-3 border rounded-2 text-md focus:outline-none focus:border-primary transition-colors ${
                    errors.major ? 'border-danger' : 'border-border'
                  }`}
                >
                  <option value="">전공을 선택해주세요</option>
                  {MAJORS.map(major => (
                    <option key={major.value} value={major.value}>
                      {major.label}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.major && (
              <p className="text-sm text-danger mt-2">{errors.major.message}</p>
            )}
          </div>

          {/* 학년 */}
          <div className="mb-6">
            <label className="block text-md font-semibold text-text-primary mb-3">
              학년 <span className="text-danger">*</span>
            </label>
            <Controller
              name="grade"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className={`w-full px-4 py-3 border rounded-2 text-md focus:outline-none focus:border-primary transition-colors ${
                    errors.grade ? 'border-danger' : 'border-border'
                  }`}
                >
                  <option value="">학년을 선택해주세요</option>
                  {GRADES.map(grade => (
                    <option key={grade.value} value={grade.value}>
                      {grade.label}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.grade && (
              <p className="text-sm text-danger mt-2">{errors.grade.message}</p>
            )}
          </div>

          {/* 재학 상태 */}
          <div className="mb-6">
            <label className="block text-md font-semibold text-text-primary mb-3">
              재학 상태 <span className="text-danger">*</span>
            </label>
            <Controller
              name="enrollmentStatus"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className={`w-full px-4 py-3 border rounded-2 text-md focus:outline-none focus:border-primary transition-colors ${
                    errors.enrollmentStatus ? 'border-danger' : 'border-border'
                  }`}
                >
                  <option value="">상태를 선택해주세요</option>
                  {ENROLLMENT_STATUS.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.enrollmentStatus && (
              <p className="text-sm text-danger mt-2">{errors.enrollmentStatus.message}</p>
            )}
          </div>

          {/* 거주지 */}
          <div className="mb-6">
            <label className="block text-md font-semibold text-text-primary mb-3">
              거주지 <span className="text-danger">*</span>
            </label>
            <Controller
              name="residenceRegion"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className={`w-full px-4 py-3 border rounded-2 text-md focus:outline-none focus:border-primary transition-colors ${
                    errors.residenceRegion ? 'border-danger' : 'border-border'
                  }`}
                >
                  <option value="">거주지를 선택해주세요</option>
                  {REGIONS.map(region => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.residenceRegion && (
              <p className="text-sm text-danger mt-2">{errors.residenceRegion.message}</p>
            )}
          </div>

          {/* 나이 (선택) */}
          <div className="mb-6">
            <label className="block text-md font-semibold text-text-primary mb-3">
              나이 <span className="text-text-tertiary">(선택사항)</span>
            </label>
            <Controller
              name="age"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  min="18"
                  max="100"
                  placeholder="만 나이를 입력해주세요"
                  className="w-full px-4 py-3 border border-border rounded-2 text-md focus:outline-none focus:border-primary transition-colors"
                />
              )}
            />
          </div>

          {/* 소득분위 (선택) */}
          <div className="mb-6">
            <label className="block text-md font-semibold text-text-primary mb-3">
              소득분위 <span className="text-text-tertiary">(선택사항, 1~10)</span>
            </label>
            <Controller
              name="incomeBracket"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  min="1"
                  max="10"
                  placeholder="모르는 경우 빈칸으로 두셔도 됩니다"
                  className="w-full px-4 py-3 border border-border rounded-2 text-md focus:outline-none focus:border-primary transition-colors"
                />
              )}
            />
          </div>

          {/* 관심 분야 */}
          <div className="mb-6">
            <label className="block text-md font-semibold text-text-primary mb-3">
              관심 분야 <span className="text-text-tertiary">(선택사항)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const updated = toggleTag(tag)
                    // Manual update since we're controlling interestTags via watch
                    const formControl = control._formValues
                    formControl.interestTags = updated
                  }}
                  className={`px-4 py-2 rounded-9999 text-sm font-medium transition-colors ${
                    (interestTags || []).includes(tag)
                      ? 'bg-primary text-white'
                      : 'bg-bg-tertiary text-text-primary border border-border'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 동의 체크박스 */}
          <div className="mb-8 p-4 bg-bg-secondary rounded-2 border border-border">
            <Controller
              name="agreeToTerms"
              control={control}
              render={({ field }) => (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    {...field}
                    type="checkbox"
                    className="mt-1 w-5 h-5 border border-border rounded-1 cursor-pointer"
                  />
                  <span className="text-sm text-text-secondary">
                    본인은 개인정보 수집·이용에 동의합니다. 수집된 정보는 맞춤형 정보 추천에만 사용되며,
                    회원 탈퇴 시 즉시 삭제됩니다.
                  </span>
                </label>
              )}
            />
            {errors.agreeToTerms && (
              <p className="text-sm text-danger mt-2">{errors.agreeToTerms.message}</p>
            )}
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-2 text-md font-semibold transition-opacity ${
              isLoading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-primary text-white hover:opacity-90'
            }`}
          >
            {isLoading ? '저장 중...' : '프로필 설정 완료'}
          </button>
        </form>

        {/* 푸터 */}
        <p className="text-center text-text-tertiary text-sm mt-6">
          프로필은 언제든지 수정할 수 있습니다
        </p>
      </div>
    </div>
  )
}
