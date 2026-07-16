import type { DetectedCategory } from '../types/noticeConfigTypes'

interface CompleteStepProps {
  siteName: string
  activeCategories: DetectedCategory[]
  onRestart: () => void
}

export function CompleteStep({ siteName, activeCategories, onRestart }: CompleteStepProps) {
  return (
    <div className="complete-main">
      <div className="success-mark" aria-hidden="true">
        ✓
      </div>
      <h1>설정이 완료되었습니다! 🎉</h1>
      <p>IRIS가 이제 공지를 감지하여 설정한 Discord 채널로 알림을 보냅니다.</p>

      <section className="summary-card">
        <h2>설정 요약</h2>
        <dl>
          <div>
            <dt>공지 사이트</dt>
            <dd>{siteName}</dd>
          </div>
          <div>
            <dt>활성 카테고리</dt>
            <dd>{activeCategories.map((category) => category.name).join(', ')}</dd>
          </div>
        </dl>
      </section>

      <section className="command-card">
        <h2>사용 가능한 명령어</h2>
        <div>
          <span>/help</span>
          <p>명령어 목록 보기</p>
        </div>
        <div>
          <span>/setup</span>
          <p>관리자 설정</p>
        </div>
        <div>
          <span>/subscribe</span>
          <p>카테고리 구독/해제</p>
        </div>
        <div>
          <span>/keyword</span>
          <p>키워드 등록/관리</p>
        </div>
      </section>

      <section className="next-guide-card">
        <h2>다음에 할 수 있는 일</h2>
        <p>관리자 권한이 있는 사용자는 /setup으로 언제든 설정을 다시 열 수 있습니다.</p>
        <p>자세한 명령어 설명은 Discord에서 /help 명령어로 확인할 수 있습니다.</p>
      </section>

      <button className="wide-primary restart-action" type="button" onClick={onRestart}>
        처음으로 이동
      </button>
    </div>
  )
}
