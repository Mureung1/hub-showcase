// 연습 2회차 — 빈칸 7개
// 답지: client/src/components/RecordCard.jsx

// 힌트: 날짜를 한국어로 바꿔주는 함수 — '../utils/formatDate'에서 가져온다
import formatDate from /* TODO: ___ */

// 힌트: 기록 하나(checkin)와, 카드가 클릭됐을 때 부모에게 알리는 함수(onSelect)를 받는다
function RecordCard(/* TODO: ___ */) {
  return (
    // 힌트: 클릭 이벤트를 부모로 올린다 — onSelect가 있으면 onSelect(checkin) 호출
    <article className="record-card" onClick={/* TODO: ___ */}>
      {/* 힌트: checkin.createdAt을 formatDate로 바꿔서 보여준다 */}
      <time dateTime={checkin.createdAt}>{/* TODO: ___ */}</time>
      {/* 힌트: 사용자가 쓴 원문은 checkin.rawText */}
      <p className="record-raw">“{/* TODO: ___ */}”</p>
      <dl>
        {/* 힌트: 세 항목은 checkin의 emotion, cause, action */}
        <div><dt>감정</dt><dd>{/* TODO: ___ */}</dd></div>
        <div><dt>원인</dt><dd>{/* TODO: ___ */}</dd></div>
        <div><dt>작은 행동</dt><dd>{/* TODO: ___ */}</dd></div>
      </dl>
    </article>
  )
}

export default RecordCard
