// 성인 대상 가명 파일럿 사전 고지(ADR-006). 목적·수집 항목·보존·철회 경로를 동의 체크 전에 보여준다.
export function ConsentNotice() {
  return (
    <div className="notice" style={{ marginBottom: 12 }}>
      <p style={{ marginTop: 0 }}>
        <strong>이 저장은 교육·자기연구 목적의 파일럿입니다.</strong> 기관 연구윤리 심사(IRB)나 논문·학회 발표를 전제하지 않습니다.
        <strong> 성인 사용자만 참여</strong>하도록 안내합니다.
      </p>
      <ul style={{ margin: "8px 0", paddingLeft: 18 }}>
        <li>수집 항목(비식별): 기질·매칭/기준 방법, 적합도·이해도·실행가능성 점수, 집중·피로 수치, 보정오차, 알고리즘 버전. <strong>이름·자유응답·원 설문 응답은 수집하지 않습니다.</strong></li>
        <li>식별 방식: 이 브라우저가 생성한 익명 ID(anonId)만 사용하며, 계정·로그인과 연결되지 않습니다.</li>
        <li>보존: 별도 삭제 전까지 서버(현재 in-memory)에 보관하며, 서버 재시작 시에도 소실될 수 있습니다.</li>
        <li>철회: 아래 "내 서버 기록 삭제"로 언제든 전량 삭제할 수 있고, 동의하지 않아도 앱의 다른 기능은 그대로 사용됩니다.</li>
      </ul>
    </div>
  );
}
