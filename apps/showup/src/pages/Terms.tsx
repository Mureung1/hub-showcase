import { Link } from 'react-router-dom'

const Terms = () => (
  <div className="min-h-screen bg-gray-50">
    <header className="border-b border-gray-200 bg-white p-4">
      <Link to="/" className="text-sm text-blue-600 hover:underline">← 홈으로</Link>
    </header>
    <main className="mx-auto max-w-2xl p-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">이용약관</h1>
      <p className="mb-6 text-sm text-gray-500">시행일: 2026년 7월 28일 · MVP 운영 초안</p>
      <div className="space-y-6 rounded-xl bg-white p-6 text-sm leading-6 text-gray-700 shadow-sm">
        <section>
          <h2 className="mb-1 font-semibold text-gray-900">1. 서비스 목적</h2>
          <p>ShowUp은 소상공인이 고객의 예약·방문·노쇼·응대 사건 이력을 기록하고 예약 판단에 참고할 위험 지표를 확인하도록 돕는 서비스입니다.</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-gray-900">2. 이용자의 의무</h2>
          <p>이용자는 적법하게 수집한 정보만 입력하고, 사건 메모에는 확인 가능한 사실만 기록해야 합니다. 허위·비방·차별적 기록, 계정 공유, 타 가게 데이터 접근 시도를 금지합니다.</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-gray-900">3. 위험 지표의 성격</h2>
          <p>위험 점수와 경고는 참고용 지표입니다. 서비스는 예약을 자동 차단하지 않으며 최종 결정과 기록의 정확성에 대한 책임은 이용자에게 있습니다.</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-gray-900">4. 서비스 제공과 변경</h2>
          <p>MVP는 무료 테스트 서비스로 제공되며 사전 고지 후 기능을 변경하거나 중단할 수 있습니다. 장애·점검·Firebase 등 외부 서비스 사유로 일시 중단될 수 있습니다.</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-gray-900">5. 데이터와 계정</h2>
          <p>가게 운영자는 자신이 입력한 고객 기록을 관리해야 합니다. 고객 삭제 시 연결된 예약과 사건도 삭제하지만, 계정 탈퇴 자동 삭제 기능은 아직 제공하지 않습니다.</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-gray-900">6. 책임 제한</h2>
          <p>고의 또는 중대한 과실이 없는 한, 참고 지표에 대한 의존이나 이용자가 입력한 부정확한 기록으로 발생한 간접 손해에 책임을 지지 않습니다.</p>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-gray-900">7. 문의</h2>
          <p>
            서비스 문의는 GitHub{' '}
            <a href="https://github.com/Min0504" className="text-blue-600 hover:underline">
              @Min0504
            </a>
            를 이용합니다.
          </p>
        </section>
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          실제 상용 운영 전 전자상거래·개인정보·소비자 보호 관련 법률 검토와 사업자 정보 보완이 필요합니다.
        </p>
      </div>
    </main>
  </div>
)

export default Terms
