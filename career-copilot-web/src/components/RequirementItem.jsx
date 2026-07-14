import { useState } from 'react'
import { GRADES } from '../data/mockData.js'

// RequirementItem = 요구사항 한 줄. 자기만의 "펼침" 상태를 가진다(지역 상태).
//  클릭하면 근거·개념/구현축·AI관여를 펼쳐 보여준다.
export default function RequirementItem({ req }) {
  const [open, setOpen] = useState(false)
  const g = GRADES[req.grade]

  return (
    <div className={`req ${open ? 'req-open' : ''}`}>
      <button className="req-head" onClick={() => setOpen((o) => !o)}>
        <span className="req-label">{req.label}</span>
        <span className="req-right">
          <span className={`badge badge-${g.cls}`}>{g.label}</span>
          <span className="chev">{open ? '▾' : '▸'}</span>
        </span>
      </button>

      {open && (
        <div className="req-body">
          <div className="axes">
            <span className={`axis ${req.concept ? 'axis-on' : ''}`}>
              개념 {req.concept ? 'O' : 'X'}
            </span>
            <span className="axis">구현 {req.impl}</span>
          </div>
          <p className="why">{req.why}</p>
          {req.ai && <p className="ai-note">🔎 {req.ai}</p>}
        </div>
      )}
    </div>
  )
}
