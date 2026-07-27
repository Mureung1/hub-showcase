import { josa, withJosa } from "../../lib/josa";

// 🧭 이렇게 가세요 — 등록된 다른 경로에 같은 매칭을 돌린 결과(간이 재매칭)로 대안을 권한다.
// 소요시간처럼 데이터에 없는 정보는 말하지 않는다. affected=false면 부모가 아예 렌더하지 않음.
export default function AltVerdict({ altRoute, others, hits }) {
  if (others.length === 0) {
    return (
      <div className="rp-block">
        <div className="rp-kicker">🧭 다른 길은요?</div>
        <h4>등록된 다른 경로가 없어요</h4>
        <div className="sub">경로를 하나 더 등록해두면, 이런 상황에 미리캣이 대안을 제안해드려요.</div>
      </div>
    );
  }

  if (!altRoute) {
    return (
      <div className="rp-block notice">
        <div className="rp-kicker">🧭 다른 길은요?</div>
        <h4>등록된 다른 경로도 이번 공지의 영향권이에요</h4>
        <div className="sub">공지 원문을 확인하고 이동 계획을 조정해 보세요.</div>
      </div>
    );
  }

  return (
    <div className="rp-block reco">
      <div className="rp-kicker">🧭 이렇게 가세요</div>
      <div className="rp-alt">
        <span className="okc">✓</span>
        <div>
          <h4>오늘은 <b style={{ fontWeight: 700 }}>{altRoute.name}</b>{josa(altRoute.name, "로", "으로")} 우회하세요</h4>
          <div className="sub">
            {altRoute.lines ? `${altRoute.lines} 이용 · ` : ""}
            {withJosa([...hits].join(", "), "와", "과")} 겹치지 않는 경로예요
          </div>
        </div>
      </div>
    </div>
  );
}
