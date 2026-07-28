import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signUp } from '@/services/auth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { toast } from 'sonner'

const registerSchema = z.object({
  email: z.string().email('이메일 형식이 아닙니다'),
  password: z.string().min(6, '비밀번호는 6 자 이상입니다'),
  confirmPassword: z.string(),
  storeName: z.string().min(2, '가게 이름을 입력해주세요').max(100, '가게 이름은 100자 이하여야 합니다'),
  storeCategory: z.string().min(2, '업종을 선택해주세요'),
  agreePrivacy: z.boolean().refine((val) => val === true, '동의해야 합니다'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

const Register = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    try {
      await signUp({
        email: data.email,
        password: data.password,
        storeName: data.storeName,
        storeCategory: data.storeCategory,
        agreedToPrivacy: data.agreePrivacy,
      })
      toast.success('회원가입이 완료되었습니다')
      navigate('/login')
    } catch (error) {
      toast.error('회원가입 실패: ' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">회원가입</h1>
          <p className="text-gray-500 mt-2">가게 정보를 입력해주세요</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="이메일"
            type="email"
            placeholder="example@email.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="비밀번호"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="비밀번호 확인"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Input
            label="가게 이름"
            type="text"
            placeholder="예: 스타벅스 강남점"
            error={errors.storeName?.message}
            {...register('storeName')}
          />

          <div>
            <label htmlFor="storeCategory" className="block text-sm font-medium text-gray-700 mb-1">
              업종
            </label>
            <select
              id="storeCategory"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              {...register('storeCategory')}
            >
              <option value="">업종을 선택해주세요</option>
              <option value="cafe">카페</option>
              <option value="restaurant">식당</option>
              <option value="beauty">미용실</option>
              <option value="studio">공방</option>
              <option value="academy">학원</option>
              <option value="etc">기타</option>
            </select>
            {errors.storeCategory && (
              <p className="mt-1 text-sm text-red-600">{errors.storeCategory.message}</p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="agreePrivacy"
              className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              {...register('agreePrivacy')}
            />
            <label htmlFor="agreePrivacy" className="text-sm text-gray-700">
              <span className="font-medium">[필수]</span>{' '}
              <Link to="/privacy" target="_blank" rel="noreferrer" className="text-blue-600 underline">
                개인정보처리방침
              </Link>{' '}
              및{' '}
              <Link to="/terms" target="_blank" rel="noreferrer" className="text-blue-600 underline">
                이용약관
              </Link>
              에 동의합니다
            </label>
          </div>
          {errors.agreePrivacy && (
            <p className="text-sm text-red-600">{errors.agreePrivacy.message}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isLoading}
          >
            {isLoading ? '가입 중...' : '회원가입'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
