// TODO: docs/prototype-auth-redeem.html ⑨ 참고
// 완료확인(RequestDetailPage)과 동일한 "상대방이 확인해야 처리" 원칙 재사용
// 헬퍼가 "사용하기" 클릭 -> 이 화면 진입(대기) -> 사장님이 확인 버튼 클릭 -> server가 차감 처리
export default function TicketRedeemPage() {
  return (
    <section>
      <h1 className="sec-title">식사권 사용확인</h1>
      <p className="sec-cap">2주차 구현 예정</p>
    </section>
  );
}
