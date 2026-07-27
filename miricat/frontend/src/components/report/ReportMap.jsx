import Miricat from "../Miricat";

// 브리핑 리포트의 지도. 도로 격자·경로 좌표는 프로토타입에서 가져온 "연출용 그림"이고
// (실좌표 지도는 이후 티켓), 데이터로 움직이는 건 라벨·통제 표시·대안 점선 여부뿐이다.
export default function ReportMap({ affected, originName, destName, eventLabel, showAlt }) {
  return (
    <div className="report-map">
      <svg viewBox="0 0 620 430" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {/* 도시 도로 격자 (배경 연출) */}
        <g stroke="#DEE4EA" strokeWidth="10" strokeLinecap="round">
          <path d="M-20 90 H640" /><path d="M-20 210 H640" /><path d="M-20 330 H640" />
          <path d="M110 -20 V450" /><path d="M300 -20 V450" /><path d="M480 -20 V450" />
        </g>
        <g stroke="#E7EDF2" strokeWidth="5">
          <path d="M-20 150 H640" /><path d="M-20 270 H640" />
          <path d="M200 -20 V450" /><path d="M395 -20 V450" />
        </g>

        {/* 통제 구역 (영향 있을 때만) */}
        {affected && (
          <circle cx="300" cy="150" r="72" fill="rgba(228,87,46,.09)"
            stroke="#E4572E" strokeWidth="1.5" strokeDasharray="4 5" />
        )}

        {/* 대안 경로 점선 (영향권 밖 대안이 실제로 있을 때만) */}
        {showAlt && (
          <path d="M60 372 H200 V270 H395 V150 H480 V90 H560" stroke="#3E7CB1"
            strokeWidth="4" fill="none" strokeDasharray="8 7" opacity=".5" strokeLinecap="round" />
        )}

        {/* 내 경로 — 영향 있으면 통제 구간만 빨갛게 끊어 그린다 */}
        {affected ? (
          <>
            <path d="M60 372 V210 H240" stroke="#3E7CB1" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M240 210 L360 150" stroke="#E4572E" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M360 150 H480 V90 H560" stroke="#3E7CB1" strokeWidth="6" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <path d="M60 372 V210 H395 V150 H480 V90 H560" stroke="#3E7CB1"
            strokeWidth="6" fill="none" strokeLinecap="round" />
        )}

        {/* 출발/도착 노드 */}
        <circle cx="60" cy="372" r="9" fill="#fff" stroke="#33261A" strokeWidth="3.5" />
        <circle cx="560" cy="90" r="9" fill="#33261A" stroke="#fff" strokeWidth="3" />
        {/* 라벨은 안쪽으로 흐르게 정렬 — slice 크롭으로 긴 이름이 모서리에서 잘리는 것 방지 */}
        <text x="48" y="404" fontSize="12" fontWeight="600" fill="#33261A" textAnchor="start">
          {originName || "집"}
        </text>
        <text x="572" y="66" fontSize="12" fontWeight="600" fill="#33261A" textAnchor="end">
          {destName || "회사"}
        </text>

        {/* 통제 지점 핀 + 사건 라벨 */}
        {affected && (
          <>
            <g transform="translate(300 118)">
              <path d="M0 26 C -12 12, -12 -4, 0 -10 C 12 -4, 12 12, 0 26 Z" fill="#E4572E" />
              <circle cx="0" cy="2" r="4.5" fill="#fff" />
            </g>
            {eventLabel && (
              <text x="300" y="246" fontSize="11" fontWeight="600" fill="#E4572E" textAnchor="middle">
                {eventLabel}
              </text>
            )}
          </>
        )}
      </svg>

      {/* 미어캣은 SVG 밖 오버레이 — 컴포넌트(Miricat)를 그대로 재사용하기 위해 */}
      <div className="map-meerkat">
        <Miricat size={64} />
        <span className="cap">미리캣이 지켜보는 중</span>
      </div>

      <div className="map-legend">
        <span className="lg"><i></i>내 경로</span>
        {affected && <span className="lg red"><i></i>통제 구간</span>}
        {showAlt && <span className="lg dash"><i></i>대안 경로</span>}
      </div>
    </div>
  );
}
