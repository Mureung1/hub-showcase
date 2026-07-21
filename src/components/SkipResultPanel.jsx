import { useState } from 'react'

const KOREAN_DAY_LABEL = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
  SAT: '토',
  SUN: '일',
}

// 이 컴포넌트는 재배치/기록 두 갈래의 정적 템플릿 문구만 만든다.
// API 응답(reassigned, fromDayOfWeek, toDayOfWeek)의 값만 문장에 꽂아 넣고, 자유 텍스트를 렌더링하지 않는다.
function buildSkipMessage({ reassigned, fromDayOfWeek, toDayOfWeek }) {
  if (reassigned) {
    return `이번 주 세션이 밀려서 ${KOREAN_DAY_LABEL[fromDayOfWeek]}요일 루틴을 ${KOREAN_DAY_LABEL[toDayOfWeek]}요일로 옮겼습니다.`
  }
  return '쉬어가는 것도 계획의 일부예요. 내일 루틴은 그대로 유지됩니다.'
}

function SkipResultPanel({ reassigned, fromDayOfWeek, toDayOfWeek }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="rounded-lg border border-border bg-panel p-6">
      <p className="mb-5 text-[15px] text-text">
        {buildSkipMessage({ reassigned, fromDayOfWeek, toDayOfWeek })}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="rounded-pill bg-accent px-6 py-[11px] text-[14px] font-bold text-on-accent hover:bg-accent-hover"
      >
        확인
      </button>
    </div>
  )
}

export default SkipResultPanel
