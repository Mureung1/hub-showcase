function ProjectIntro() {
  return (
    <div style={{
      maxWidth: '640px',
      margin: '60px auto',
      padding: '32px',
      fontFamily: '-apple-system, sans-serif',
      lineHeight: 1.7,
      border: '1px solid #e0e0e0',
      borderRadius: '12px'
    }}>
      <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>🌊 TideNote</h1>
      <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
        State-Contextualized Recall for LLM Self-Disclosure
      </p>

      <p style={{ marginBottom: '16px' }}>
        새벽에 AI에게 털어놓은 이야기를, 다음날 아침 낯선 타인의 고백처럼 느껴본 적 있나요?
        각성이 낮아진 새벽 시간대의 자기개방은 구조적으로 더 깊어지지만,
        지금의 AI는 그 발화가 <b>어떤 상태에서 만들어졌는지</b>를 기억하지 못한 채
        그대로 다시 불러옵니다.
      </p>

      <p style={{ marginBottom: '20px' }}>
        TideNote는 발화가 생성된 시점의 상태(D_gen)와 다시 마주하는 시점의 상태(D_recall)
        사이의 격차를 계산해, 격차가 클 때는 원문 대신 짧은 요약만 먼저 보여주고
        원문은 사용자가 능동적으로 선택할 때만 열립니다.
      </p>

      <div style={{
        background: '#f7f9fb',
        borderRadius: '8px',
        padding: '16px',
        fontSize: '14px',
        color: '#555',
        marginBottom: '20px'
      }}>
        같은 해안선도 밀물과 썰물에 따라 다른 높이로 물에 잠기듯,
        같은 대화도 발화된 순간의 상태에 따라 다르게 다시 떠오릅니다.
      </div>

      <div>
        {['Circadian Rhythm', 'Self-Disclosure', 'Encoding Specificity', 'LLM Memory'].map(tag => (
          <span key={tag} style={tagStyle}>{tag}</span>
        ))}
      </div>
    </div>
  );
}

const tagStyle = {
  display: 'inline-block',
  background: '#eef1f5',
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '13px',
  marginRight: '8px',
  marginTop: '8px'
};

export default ProjectIntro;