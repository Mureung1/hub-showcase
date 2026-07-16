import type { AdminStep } from '../types/adminFlowTypes'

interface GuideStepProps {
  number: string
  title: string
  description: string
}

function GuideStep({ number, title, description }: GuideStepProps) {
  return (
    <section className="guide-step">
      <span>{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </section>
  )
}

export function GuidePanel({ step }: { step: AdminStep }) {
  if (step === 'site') {
    return (
      <aside className="guide-panel">
        <h2>Guide</h2>
        <div className="guide-step-list">
          <GuideStep
            number="01"
            title="공지 사이트 입력"
            description="공지 목록이 있는 페이지의 이름과 URL을 입력합니다."
          />
          <GuideStep
            number="02"
            title="Selector 설정"
            description="목록, 제목, 링크, 날짜, 카테고리를 찾을 CSS Selector를 입력합니다."
          />
          <GuideStep
            number="03"
            title="테스트 크롤링 확인"
            description="최근 공지와 감지된 카테고리가 제대로 보이는지 확인합니다."
          />
        </div>
        <p className="guide-tip">
          💡 Selector 설정은 직접 입력하기 어려울 수 있으므로 설정 방법과 개발자에게 요청하는 방법을 이용해주세요.
        </p>
      </aside>
    )
  }

  return (
    <aside className="guide-panel">
      <h2>Guide</h2>
      <div className="guide-step-list">
        <GuideStep
          number="01"
          title="카테고리 확인"
          description="테스트 크롤링에서 감지된 카테고리 목록을 확인합니다."
        />
        <GuideStep
          number="02"
          title="채널 연결"
          description="카테고리별로 알림을 보낼 Discord 채널을 선택합니다."
        />
        <GuideStep
          number="03"
          title="Role 설정"
          description="활성화된 카테고리는 구독 Role 생성 대상이 됩니다."
        />
      </div>
    </aside>
  )
}
