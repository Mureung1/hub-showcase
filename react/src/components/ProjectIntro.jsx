function ProjectIntro() {
  const containerStyle = {
    maxWidth: "960px",
    margin: "60px auto",
    padding: "40px 24px",
    fontFamily: "Arial, sans-serif",
    color: "#222222",
  };

  const headerStyle = {
    textAlign: "center",
    marginBottom: "48px",
  };

  const projectListStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "24px",
  };

  const cardStyle = {
    flex: "1 1 360px",
    padding: "28px",
    border: "1px solid #dddddd",
    borderRadius: "16px",
    backgroundColor: "#ffffff",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
  };

  const badgeStyle = {
    display: "inline-block",
    padding: "6px 12px",
    marginBottom: "16px",
    borderRadius: "20px",
    backgroundColor: "#eeeeee",
    fontSize: "14px",
    fontWeight: "bold",
  };

  const titleStyle = {
    marginTop: 0,
    marginBottom: "16px",
    fontSize: "26px",
  };

  const descriptionStyle = {
    lineHeight: "1.7",
    color: "#555555",
  };

  const listStyle = {
    paddingLeft: "20px",
    lineHeight: "1.8",
  };

  const recommendationStyle = {
    marginTop: "40px",
    padding: "28px",
    borderRadius: "16px",
    backgroundColor: "#f5f7fa",
    lineHeight: "1.7",
  };

  return (
    <main style={containerStyle}>
      <header style={headerStyle}>
        <p
          style={{
            marginBottom: "10px",
            fontSize: "15px",
            fontWeight: "bold",
            color: "#666666",
          }}
        >
          AI Agent Challenge
        </p>

        <h1
          style={{
            margin: 0,
            fontSize: "40px",
          }}
        >
          프로젝트 아이디어 소개
        </h1>

        <p
          style={{
            maxWidth: "700px",
            margin: "20px auto 0",
            lineHeight: "1.7",
            color: "#555555",
          }}
        >
          Claude Code와 같은 개발 에이전트를 활용하여 4주 안에 빠르게
          구현할 수 있는 두 가지 서비스 아이디어를 소개합니다.
        </p>
      </header>

      <section style={projectListStyle}>
        <article style={cardStyle}>
          <span style={badgeStyle}>아이디어 1</span>

          <h2 style={titleStyle}>실시간 기상 변화 알림 서비스</h2>

          <p style={descriptionStyle}>
            사용자의 위치나 이동 경로에 해당하는 기상 정보를 지속적으로
            확인하고, 비가 내릴 가능성이 갑자기 높아지거나 강수확률이
            급격히 증가하면 사용자에게 알림을 보내는 서비스입니다.
          </p>

          <h3>주요 기능</h3>

          <ul style={listStyle}>
            <li>실시간 기상 정보 조회</li>
            <li>강수확률 및 강수량 변화 감지</li>
            <li>출발지와 목적지 경로의 날씨 확인</li>
            <li>비가 예상될 때 알림 제공</li>
            <li>AI를 활용한 자연어 날씨 안내</li>
          </ul>

          <h3>기대 효과</h3>

          <p style={descriptionStyle}>
            사용자는 단순히 현재 날씨를 확인하는 것을 넘어, 가까운 시간
            안에 비가 내릴 가능성을 미리 안내받아 우산을 준비하거나 이동
            계획을 변경할 수 있습니다.
          </p>
        </article>

        <article style={cardStyle}>
          <span style={badgeStyle}>아이디어 2</span>

          <h2 style={titleStyle}>택시 동승자 매칭 서비스</h2>

          <p style={descriptionStyle}>
            혼자 택시를 타기에는 비용이 부담될 때 출발지, 목적지, 출발
            시간을 등록하고, 비슷한 방향으로 이동하는 사람을 찾아 함께
            택시를 이용할 수 있도록 돕는 서비스입니다.
          </p>

          <h3>주요 기능</h3>

          <ul style={listStyle}>
            <li>출발지와 목적지 등록</li>
            <li>희망 출발 시간 입력</li>
            <li>등록된 동승 모집 게시글 조회</li>
            <li>이동 경로가 비슷한 사용자 추천</li>
            <li>예상 택시 비용과 절약 비용 안내</li>
          </ul>

          <h3>기대 효과</h3>

          <p style={descriptionStyle}>
            이동 방향이 비슷한 사용자들이 택시를 함께 이용하여 교통비를
            줄일 수 있으며, 특히 학교나 터미널처럼 이동 수요가 집중되는
            장소에서 유용하게 활용할 수 있습니다.
          </p>
        </article>
      </section>

      <section style={recommendationStyle}>
        <h2 style={{ marginTop: 0 }}>우선 개발 프로젝트</h2>

        <p>
          두 아이디어 중 4주 안에 실제로 동작하는 결과물을 완성하기에는
          실시간 기상 변화 알림 서비스가 더 적합합니다.
        </p>

        <p>
          기상 데이터는 공공 API를 통해 확보할 수 있고, 사용자가 많지
          않아도 혼자서 전체 기능을 테스트하고 시연할 수 있습니다. 따라서
          먼저 기상 알림 서비스를 구현하고, 택시 동승 서비스는 이후 확장
          프로젝트로 발전시키는 것을 목표로 합니다.
        </p>
      </section>
    </main>
  );
}

export default ProjectIntro;