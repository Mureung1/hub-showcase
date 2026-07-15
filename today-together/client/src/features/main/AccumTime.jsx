// 모닥불 우측 하단에 표기되는 누적 시간
// value는 지금은 목업 문자열. 추후 백엔드 연결 시 props로 실데이터 전달.

export default function AccumTime({ value = "12시간 40분" }) {
  return (
    <div className="accum-time">
      ⏱ 누적 <strong>{value}</strong>
    </div>
  );
}
