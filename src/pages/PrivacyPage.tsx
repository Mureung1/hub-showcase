import styles from "./PrivacyPage.module.css";

function PrivacyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.heading}>
        <p className="section-kicker">Privacy</p>
        <h1>개인정보와 기록 보관 안내</h1>
        <p>Modu Brain이 저장하는 정보와 외부 AI 전송 조건을 서비스 사용 전에 확인할 수 있습니다.</p>
      </header>

      <div className={styles.grid}>
        <section className="result-panel">
          <h2>수집·저장하는 정보</h2>
          <p>로그인을 위한 이메일, 사용자가 만든 프로젝트·원문·분석 결과·주석, 서비스 보호를 위한 제한 사용량을 저장합니다.</p>
          <p>공유 링크에는 계정 이메일과 원문 전체를 포함하지 않으며, 기본 요약 모드에서는 참여자 이름·원문 제목·정확한 인용문도 제외합니다.</p>
        </section>

        <section className="result-panel">
          <h2>OpenAI 전송</h2>
          <p>로컬 분석이 기본입니다. 사용자가 OpenAI 분석을 명시적으로 선택한 경우에만 선택한 원문을 서버에서 전송합니다.</p>
          <p>전송 전에 탐지 가능한 개인정보를 확인하고 마스킹할 수 있으며, 요청은 저장 비활성화 설정과 비식별 안전 식별자를 사용합니다.</p>
        </section>

        <section className="result-panel">
          <h2>보관과 삭제</h2>
          <p>새 프로젝트는 원문과 분석을 기본 90일 보관합니다. 프로젝트 설정에서 30일 또는 사용자가 삭제할 때까지로 바꿀 수 있습니다.</p>
          <p>보관 기간이 끝난 원문은 관련 분석·스냅숏·공유 링크와 함께 삭제됩니다. 암호화 백업에는 삭제된 데이터가 최대 7일 더 남을 수 있습니다.</p>
        </section>

        <section className="result-panel">
          <h2>보안 제보와 문의</h2>
          <p>취약점은 공개 이슈에 개인정보나 재현 토큰을 남기지 말고 GitHub 비공개 보안 제보를 이용해 주세요.</p>
          <a className="text-link" href="https://github.com/tjwnsdhfz/hub/security/advisories/new" target="_blank" rel="noreferrer">비공개 보안 제보 열기</a>
        </section>
      </div>
      <p className={styles.updated}>최종 업데이트: 2026년 7월 13일</p>
    </main>
  );
}

export default PrivacyPage;
