function ProjectIntro() {
  return (
    <section className="project-intro">
      <p className="eyebrow">박지은 | AI AGENT CHALLENGE 목표</p>

      <h1>PM 인터뷰 설계 자동화 Agent</h1>

      <p className="description">
        IT 기업 Product Manager가 사용자 인터뷰를 더 빠르고 체계적으로 진행할 수 있도록,
        타겟 컨택부터 일정 조율, 질문 설계, 인터뷰 전사, 사후 요약까지의 과정을 자동화하는 Agent입니다.
      </p>

      <div className="card-grid">
        <article className="card">
          <h2>Stage 1</h2>
          <p>이메일 발송과 캘린더 연동을 통해 인터뷰 가능 시간을 자동으로 조율합니다.</p>
        </article>

        <article className="card">
          <h2>Stage 2</h2>
          <p>PM이 입력한 가설을 바탕으로 LLM이 인터뷰 질문 초안을 생성합니다.</p>
        </article>

        <article className="card">
          <h2>Stage 3</h2>
          <p>인터뷰 녹음 파일을 업로드하고 STT를 통해 전사 텍스트를 생성합니다.</p>
        </article>

        <article className="card">
          <h2>Stage 4</h2>
          <p>전사 내용을 가설별로 정리하고 핵심 발언과 감정적 뉘앙스를 요약합니다.</p>
        </article>
      </div>

      <p className="phase-note">
         4주의 기간 및 각 기능의 개발 난이도에 따라, 이 중 일부만 개발될 가능성도 있습니다.
      </p>
    </section>
  );
}

export default ProjectIntro;