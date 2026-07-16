import { useState } from 'react'
import { authApi } from '../utils/apiClient'
import { z } from 'zod'

interface AuthPageProps {
  onAuthSuccess: (token: string) => void
}

const AuthSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
})

const SignupSchema = AuthSchema.extend({
  nickname: z.string().min(2, '닉네임은 2자 이상이어야 합니다').max(20, '닉네임은 20자 이하여야 합니다'),
})

export default function Auth({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [formData, setFormData] = useState({ email: '', password: '', nickname: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    setIsLoading(true)

    try {
      // Zod 검증
      const data = mode === 'login'
        ? AuthSchema.parse(formData)
        : SignupSchema.parse(formData)

      if (mode === 'login') {
        const response = await authApi.login(data.email, data.password)
        if (response.data?.accessToken) {
          onAuthSuccess(response.data.accessToken)
        }
      } else {
        const response = await authApi.signup(data.email, data.password, (data as any).nickname)
        if (response.data?.accessToken) {
          onAuthSuccess(response.data.accessToken)
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0]] = err.message
          }
        })
        setErrors(newErrors)
      } else {
        setServerError(error.message || '요청 처리 중 오류가 발생했습니다')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-secondary">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            {mode === 'login' ? '로그인' : '회원가입'}
          </h1>
          <p className="text-md text-text-secondary">
            {mode === 'login'
              ? '계정으로 로그인하세요'
              : '새로운 계정을 만들어보세요'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-bg-primary rounded-2xl p-8 shadow-sm">
          {/* 서버 에러 */}
          {serverError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2 text-danger text-sm">
              {serverError}
            </div>
          )}

          {/* 이메일 */}
          <div className="mb-6">
            <label className="block text-md font-semibold text-text-primary mb-3">
              이메일 <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@university.ac.kr"
              className={`w-full px-4 py-3 border rounded-2 text-md focus:outline-none focus:border-primary transition-colors ${
                errors.email ? 'border-danger' : 'border-border'
              }`}
            />
            {errors.email && (
              <p className="text-sm text-danger mt-2">{errors.email}</p>
            )}
          </div>

          {/* 비밀번호 */}
          <div className="mb-8">
            <label className="block text-md font-semibold text-text-primary mb-3">
              비밀번호 <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={mode === 'login' ? '비밀번호 입력' : '6자 이상 입력'}
              className={`w-full px-4 py-3 border rounded-2 text-md focus:outline-none focus:border-primary transition-colors ${
                errors.password ? 'border-danger' : 'border-border'
              }`}
            />
            {errors.password && (
              <p className="text-sm text-danger mt-2">{errors.password}</p>
            )}
          </div>

          {/* 닉네임 (회원가입 모드에서만 표시) */}
          {mode === 'signup' && (
            <div className="mb-8">
              <label className="block text-md font-semibold text-text-primary mb-3">
                닉네임 <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                placeholder="2~20자 입력"
                className={`w-full px-4 py-3 border rounded-2 text-md focus:outline-none focus:border-primary transition-colors ${
                  errors.nickname ? 'border-danger' : 'border-border'
                }`}
              />
              {errors.nickname && (
                <p className="text-sm text-danger mt-2">{errors.nickname}</p>
              )}
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-2 text-md font-semibold transition-opacity mb-4 ${
              isLoading
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-primary text-white hover:opacity-90'
            }`}
          >
            {isLoading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </button>

          {/* 모드 전환 */}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setFormData({ email: '', password: '', nickname: '' })
              setErrors({})
              setServerError(null)
            }}
            className="w-full py-2 px-4 rounded-2 text-md font-medium text-primary border border-primary hover:bg-primary hover:text-white transition-colors"
          >
            {mode === 'login'
              ? '계정이 없으신가요? 회원가입'
              : '이미 계정이 있으신가요? 로그인'}
          </button>
        </form>

        <p className="text-center text-text-tertiary text-sm mt-6">
          테스트 계정: test@example.com / password123
        </p>
      </div>
    </div>
  )
}
