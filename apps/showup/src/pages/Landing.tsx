import { Link, useNavigate } from 'react-router-dom'
import { useAuthState } from '@/hooks/useAuth'

const Landing = () => {
  const { user } = useAuthState()
  const navigate = useNavigate()

  const handleLogoClick = () => {
    if (user) {
      navigate('/app/dashboard')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={handleLogoClick} className="text-xl font-bold text-gray-900">
            ShowUp
          </button>
          <Link
            to="/login"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            로그인
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-4xl font-bold text-gray-900 leading-tight">
          노쇼 위험, 미리 확인하세요
        </h2>
        <p className="text-lg text-gray-600 mt-4">
          예약 관리와 고객 위험도를 한 화면에서
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/register"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-center"
          >
            무료로 시작하기
          </Link>
          <Link
            to="/login"
            className="px-8 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
          >
            로그인
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900">고객 검색</h3>
                <p className="text-sm text-gray-600 mt-1">
                  전화번호 뒤 4자리로 과거 예약 이력과 위험도를 즉시 확인하세요
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900">위험도 경고</h3>
                <p className="text-sm text-gray-600 mt-1">
                  노쇼 3회 이상 또는 응대 사건이 있는 고객에게 예약금 요청을 권장합니다
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900">예약 관리</h3>
                <p className="text-sm text-gray-600 mt-1">
                  오늘의 예약을 한눈에 보고 방문·노쇼·취소 상태를 기록하세요
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-gray-600 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900">개인정보 보호</h3>
                <p className="text-sm text-gray-600 mt-1">
                  전화번호는 마스킹 처리, 사건 기록은 사실만 기록합니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          지금 시작하세요
        </h2>
        <p className="text-gray-600 mt-2">
          1분 만에 가입하고 바로 사용할 수 있습니다
        </p>
        <Link
          to="/register"
          className="inline-block mt-6 px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          무료 가입
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center">
          <p className="text-sm text-gray-500">ShowUp</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/privacy" className="text-sm text-gray-500 hover:underline">
              개인정보처리방침
            </Link>
            <Link to="/terms" className="text-sm text-gray-500 hover:underline">
              이용약관
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            이 정보는 참고용 지표이며, 최종 판단은 사장님의 재량에 따릅니다.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Landing