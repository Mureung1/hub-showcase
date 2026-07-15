import { useNavigate } from 'react-router-dom'
import { selectRole } from '../lib/session.js'
import './RoleSelectPage.css'

/*
 * C0 역할 선택 (T-03). 공통 진입점 — 사장님/소비자 분기.
 * 로그인(C1)은 이번 단계 범위 밖이라 자리만 둔다.
 */
function RoleSelectPage() {
  const navigate = useNavigate()

  const choose = (role) => {
    selectRole(role)
    navigate(role === 'owner' ? '/owner' : '/app')
  }

  return (
    <main className="role">
      <div className="role__inner">
        <header className="role__head">
          <h1 className="role__title">마감할인</h1>
          <p className="role__sub">어떻게 이용하시나요?</p>
        </header>

        <div className="role__cards">
          <button type="button" className="role__card" onClick={() => choose('owner')}>
            <span className="role__card-role">사장님</span>
            <span className="role__card-desc">마감 상품을 등록하고 예약을 받아요</span>
            <span className="role__card-plat">웹앱 · 매장</span>
          </button>

          <button type="button" className="role__card" onClick={() => choose('consumer')}>
            <span className="role__card-role">소비자</span>
            <span className="role__card-desc">근처 마감 할인을 받아보고 예약해요</span>
            <span className="role__card-plat">모바일</span>
          </button>
        </div>

        <button type="button" className="role__login" disabled>
          로그인 (준비 중)
        </button>
      </div>
    </main>
  )
}

export default RoleSelectPage
