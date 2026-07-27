import { useNavigate } from 'react-router-dom'
import PickupForm from '../../components/PickupForm.jsx'
import './PickupPage.css'

/*
 * W4 픽업 확인 (T-10) — 코드 입력에 집중한 전용 화면.
 * 대시보드에도 같은 폼이 인라인으로 올라가 있어(PC 상시 화면), 이 페이지는 모바일 동선용으로 남긴다.
 */
function PickupPage() {
  const navigate = useNavigate()

  return (
    <main className="pickup">
      <div className="pickup__card">
        <button type="button" className="pickup__back" onClick={() => navigate('/owner')}>
          ← 대시보드
        </button>
        <h1 className="pickup__title">픽업 확인</h1>
        <p className="pickup__sub">손님이 제시한 4자리 코드를 입력하세요.</p>

        <PickupForm />
      </div>
    </main>
  )
}

export default PickupPage
