import { Link } from 'react-router-dom'

const sections = [
  {
    title: '1. 처리 목적',
    body: '가게 운영자가 예약 고객을 식별하고 예약·방문·노쇼·응대 사건 이력을 관리하며, 예약 전에 참고용 위험 지표를 확인할 수 있도록 처리합니다.',
  },
  {
    title: '2. 처리 항목',
    body: '가게 계정의 이메일·가게명·업종, 고객 이름·전화번호, 예약 일시·상태·메모, 사건 유형·사실 메모를 처리합니다. 전화번호 원본은 저장하지만 화면에는 마스킹해 표시합니다.',
  },
  {
    title: '3. 보유 및 이용 기간',
    body: 'MVP에서는 가게 운영자가 해당 기록을 삭제할 때까지 보유합니다. 고객 삭제 시 연결된 예약과 사건도 함께 삭제합니다. 계정 탈퇴 자동 삭제 기능은 아직 제공하지 않습니다.',
  },
  {
    title: '4. 제3자 제공 및 공유',
    body: '가게 간 고객 이력을 자동 공유하지 않으며, ShowUp이 고객 데이터를 제3자에게 판매하거나 광고 목적으로 제공하지 않습니다.',
  },
  {
    title: '5. 처리 위탁 및 국외 처리',
    body: '인증·데이터베이스·호스팅을 위해 Google Firebase를 사용합니다. Firebase의 저장 위치와 처리 조건은 Google의 서비스 약관 및 개인정보 보호정책을 따릅니다.',
  },
  {
    title: '6. 정보주체의 권리',
    body: '열람·정정·삭제 요청은 해당 정보를 입력한 가게 운영자 또는 아래 문의처를 통해 요청할 수 있습니다. 고객 본인 인증 기반 셀프서비스 화면은 Phase 2 범위입니다.',
  },
  {
    title: '7. 안전성 확보 조치',
    body: 'Firebase Authentication과 Firestore Security Rules로 가게별 접근을 격리하고, 전화번호를 화면에서 마스킹하며, 사건 유형을 제한하고 사실 중심 메모를 안내합니다.',
  },
]

const Privacy = () => (
  <div className="min-h-screen bg-gray-50">
    <header className="border-b border-gray-200 bg-white p-4">
      <Link to="/" className="text-sm text-blue-600 hover:underline">← 홈으로</Link>
    </header>
    <main className="mx-auto max-w-2xl p-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">개인정보처리방침</h1>
      <p className="mb-6 text-sm text-gray-500">시행일: 2026년 7월 28일 · MVP 운영 초안</p>
      <div className="space-y-6 rounded-xl bg-white p-6 text-sm leading-6 text-gray-700 shadow-sm">
        <p>ShowUp은 개인정보 보호법 등 관련 법령을 준수하며 다음과 같이 개인정보를 처리합니다.</p>
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-1 font-semibold text-gray-900">{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
        <section>
          <h2 className="mb-1 font-semibold text-gray-900">8. 개인정보 관련 문의</h2>
          <p>
            GitHub{' '}
            <a href="https://github.com/Min0504" className="text-blue-600 hover:underline">
              @Min0504
            </a>
            를 통해 문의할 수 있습니다.
          </p>
        </section>
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          실제 상용 운영 전 법률 전문가 검토, 처리 위탁·국외 이전 세부사항, 보유기간 및 탈퇴 절차 보완이 필요합니다.
        </p>
      </div>
    </main>
  </div>
)

export default Privacy
