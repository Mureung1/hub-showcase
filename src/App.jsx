const styles = `
  :root {
    --bg: #f5f6f5;
    --card: #ffffff;
    --border: #e3e5e1;
    --text: #191919;
    --text-secondary: #5c5c5c;
    --text-muted: #8e8e8e;
    --accent: #03c75a;
    --accent-dark: #029b46;
    --accent-bg: #e5f9ed;
    --warn: #a15c00;
    --warn-bg: #fdf1de;
    --danger: #c0392b;
    --danger-bg: #fbebe9;
    --good: #029b46;
    --good-bg: #e5f9ed;
  }
  .aiplan * { box-sizing: border-box; }
  .aiplan {
    font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.7;
    max-width: 820px;
    margin: 0 auto;
    padding: 3rem 1.5rem 6rem;
  }
  .aiplan header {
    margin-bottom: 3rem;
    border-bottom: 1px solid var(--border);
    padding-bottom: 2rem;
  }
  .aiplan header p.eyebrow {
    font-size: 13px;
    color: var(--text-muted);
    margin: 0 0 8px;
    letter-spacing: 0.02em;
  }
  .aiplan h1 {
    font-size: 28px;
    font-weight: 600;
    margin: 0 0 12px;
  }
  .aiplan header .subtitle {
    font-size: 16px;
    color: var(--text-secondary);
    margin: 0;
  }
  .aiplan h2 {
    font-size: 20px;
    font-weight: 600;
    margin: 3rem 0 1rem;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .aiplan h2 .num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .aiplan h3 {
    font-size: 15px;
    font-weight: 600;
    margin: 1.5rem 0 0.5rem;
  }
  .aiplan p { margin: 0.5rem 0; }
  .aiplan .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin: 1rem 0;
  }
  .aiplan .idea-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
    margin: 1rem 0;
  }
  .aiplan .idea-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1rem 1.1rem;
  }
  .aiplan .idea-card.rejected {
    opacity: 0.55;
  }
  .aiplan .idea-card .title {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 6px;
  }
  .aiplan .idea-card .desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
  }
  .aiplan .tag {
    display: inline-block;
    font-size: 11px;
    padding: 3px 9px;
    border-radius: 6px;
    margin-bottom: 8px;
    font-weight: 500;
  }
  .aiplan .tag.selected { background: var(--good-bg); color: var(--good); }
  .aiplan .tag.rejected { background: var(--danger-bg); color: var(--danger); }
  .aiplan .tag.considered { background: var(--warn-bg); color: var(--warn); }
  .aiplan table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin: 1rem 0;
    background: var(--card);
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .aiplan th, .aiplan td {
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }
  .aiplan th {
    background: var(--accent-bg);
    font-weight: 600;
    color: var(--accent-dark);
    font-size: 12px;
  }
  .aiplan tr:last-child td { border-bottom: none; }
  .aiplan .flow-step {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid var(--border);
  }
  .aiplan .flow-step:last-child { border-bottom: none; }
  .aiplan .flow-num {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--accent-bg);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .aiplan .flow-step .step-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 3px;
  }
  .aiplan .flow-step .step-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
  }
  .aiplan .callout {
    background: var(--accent-bg);
    border-left: 4px solid var(--accent);
    border-radius: 0 10px 10px 0;
    padding: 1rem 1.25rem;
    font-size: 14px;
    color: var(--accent-dark);
    margin: 1rem 0;
  }
  .aiplan .callout.warn {
    background: var(--warn-bg);
    color: var(--warn);
  }
  .aiplan ul { padding-left: 1.2rem; margin: 0.5rem 0; }
  .aiplan li { margin: 4px 0; font-size: 14.5px; }
  .aiplan .risk-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
  }
  .aiplan .risk-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1rem 1.1rem;
  }
  .aiplan .risk-card .risk-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--danger);
    margin: 0 0 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .aiplan .risk-card .risk-solution {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 6px 0 0;
    padding-top: 6px;
    border-top: 1px dashed var(--border);
  }
  .aiplan footer {
    margin-top: 4rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
  }
`;

const content = `
<header>
  <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
    <div style="width:26px; height:26px; border-radius:50%; background:var(--accent); flex-shrink:0;"></div>
    <p class="eyebrow" style="margin:0;">AI 에이전트 기획 노트 · 2026.07.06</p>
  </div>
  <h1>관계 맞춤형 화법 코치</h1>
  <p class="subtitle">매번 다른 사람, 매번 다른 상황에서 어떻게 말해야 할지 헷갈릴 때, 표현을 도와주는 AI 코치</p>
  <p style="font-size:12.5px; color:var(--text-muted); margin-top:14px; padding-top:14px; border-top:1px dashed var(--border);">
    ※ 본 문서는 브레인스토밍 초기 단계의 기획 자료이며, 이후 논의에 따라 방향과 세부 내용이 바뀔 수 있습니다.
  </p>
</header>

<h2><span class="num">1</span>문제의식: 왜 이 영역인가</h2>
<div class="card">
  <p>출발점은 언어 문제였다 — 사회초년생들이 예의를 지켜야 하는 상황에서 말실수를 하거나, AI 의존도가 높아지며 언어 표현 능력 자체가 줄어드는 현상. 여기서 더 나아가 "AI가 대신 해주면서 사람의 고유 능력이 퇴화하는" 더 넓은 문제군을 탐색했다.</p>
</div>

<h2><span class="num">2</span>탐색한 아이디어들</h2>
<p style="font-size: 14px; color: var(--text-secondary);">언어·감정·의료·개성 등 여러 축으로 브레인스토밍을 진행하며 나온 아이디어들. 최종 선택은 초록, 후보로 고려했던 것은 노랑, 기각한 것은 흐리게 표시.</p>

<div class="idea-grid">
  <div class="idea-card">
    <span class="tag selected">최종 선택</span>
    <p class="title">언어/커뮤니케이션 코칭</p>
    <p class="desc">직장인 상황별 톤·표현 코칭. 관계 맞춤형으로 재설계하여 최종 컨셉으로 채택.</p>
  </div>
  <div class="idea-card">
    <span class="tag considered">유력 후보였음</span>
    <p class="title">AI 정서 아웃소싱 의존 인지</p>
    <p class="desc">힘들 때 AI에게만 하소연하는 습관을 인지시키고 실제 사람에게 표현하도록 돕는 메타 코칭.</p>
  </div>
  <div class="idea-card rejected">
    <p class="title">정신적 피로 회복 코치</p>
    <p class="desc">정신적 피로를 AI에게 털어놓으며 회복 탄력성을 되찾아주는 코치.</p>
  </div>
  <div class="idea-card rejected">
    <p class="title">개성 지키기 — 문체 지킴이 / 취향 지문</p>
    <p class="desc">AI가 획일화시키는 문체·취향·창작을 지켜주는 도구군. 별도 확장 아이디어로 보류.</p>
  </div>
</div>

<h2><span class="num">3</span>핵심 의사결정: 왜 언어 코칭 단독인가</h2>
<table>
  <tr>
    <th></th>
    <th>A. 언어 코칭</th>
    <th>B. 감정 처리</th>
  </tr>
  <tr>
    <td>니즈의 명확성</td>
    <td>명확함 (그 사람과 잘 지내고 싶다)</td>
    <td>다소 막연함 (자각이 선행돼야 함)</td>
  </tr>
  <tr>
    <td>지속 사용 이유</td>
    <td>관계가 바뀔 때마다 재사용</td>
    <td>습관 재발형이라 관리형으로 지속 가능</td>
  </tr>
  <tr>
    <td>개발 난이도</td>
    <td>중간 (관계별 기록·패턴화 필요)</td>
    <td>낮음 (대화 + 넛지 위주)</td>
  </tr>
  <tr>
    <td>경쟁 강도</td>
    <td>낮음 (관계 맞춤형 화법 코칭은 드묾)</td>
    <td>중간 (멘탈케어 앱들과 일부 겹침)</td>
  </tr>
</table>
<div class="callout">
  두 축을 합치는 방안도 논의했으나, 온보딩 메시지가 애매해지고 타겟이 갈라지는 문제로 <strong>초기 단계에서는 하나만 뾰족하게 파는 것으로 결정</strong>. 언어 코칭을 "관계 맞춤형"으로 재설계하면 기존 화법 코칭의 약점(감 잡히면 이탈)을 상당 부분 해결할 수 있다고 판단.
</div>

<h2><span class="num">4</span>최종 컨셉</h2>
<div class="card">
  <h3 style="margin-top:0;">한 줄 정의</h3>
  <p>일반적인 화법 지식이 아니라, <strong>특정 사람과의 관계에서 매번 달라지는 화법을 계속 기록하고 도와주는 코치.</strong></p>
  <h3>핵심 데이터 구조</h3>
  <p>제품의 핵심 자산은 "인물 프로필"이다. 실명 대신 역할(직속상사, A거래처)로 저장하고, 대화 후 짧은 리뷰만 남기면 자동으로 프로필이 누적된다.</p>
  <h3>핵심 루프</h3>
  <ul>
    <li><strong>사전:</strong> "오늘 이 사람한테 어떻게 말할까요?" → 프로필 기반 표현 제안 + 리허설</li>
    <li><strong>직후:</strong> "어떻게 됐어요?" 한 줄 피드백 → 프로필에 자동 반영</li>
    <li><strong>누적:</strong> 몇 주 후 그 사람과의 대화 패턴 요약본 형성</li>
  </ul>
  <h3>차별화 포인트</h3>
  <ul>
    <li>그래머리류: 문장 교정(일반론) → 이 제품: 이 사람에게 맞는 표현(관계 맞춤)</li>
    <li>화법 강의/책: 정적 지식 → 이 제품: 실제 상호작용 결과를 반영해 계속 업데이트되는 동적 코치</li>
  </ul>
</div>

<h2><span class="num">5</span>핵심 리스크와 해결 방향</h2>
<div class="risk-grid">
  <div class="risk-card">
    <p class="risk-title"><span>①</span> 프라이버시 민감성</p>
    <p>상사·동료에 대한 평가성 기록을 저장한다는 부담감.</p>
    <p class="risk-solution">해결: 실명 대신 역할 라벨만 저장, 타인 평가가 아닌 "내 행동 기록"으로 프레이밍, 로컬 저장 우선, 관계 종료 시 일괄 삭제 가능.</p>
  </div>
  <div class="risk-card">
    <p class="risk-title"><span>②</span> 콜드스타트 문제</p>
    <p>초반엔 그 사람에 대한 데이터가 없어 일반론으로만 시작.</p>
    <p class="risk-solution">해결: 온보딩에서 2~3개 객관식으로 가벼운 초기 데이터 확보, 유형별 템플릿 선先 제공, 첫날 즉각적인 원샷 도움으로 빠른 성공 경험 제공.</p>
  </div>
  <div class="risk-card">
    <p class="risk-title"><span>③</span> 피드백 누적 마찰</p>
    <p>사후 1줄 리뷰조차 귀찮아서 안 남기면 리텐션 엔진이 작동하지 않음.</p>
    <p class="risk-solution">해결: 버튼 3개(좋았어요/그냥그랬어요/별로였어요) 수준으로 마찰 최소화, 다음날 자연스러운 체크인 알림으로 유도.</p>
  </div>
  <div class="risk-card">
    <p class="risk-title"><span>④</span> "졸업 가능함" 문제</p>
    <p>화법 감이 잡히면 더 이상 앱을 쓸 이유가 없어질 수 있음.</p>
    <p class="risk-solution">해결: 관계가 계속 바뀌므로(이직, 새 상사, 새 프로젝트) 완전한 졸업은 어려움. 다만 향후 패키지형 모델(신입사원 3개월 등)도 검토 대상.</p>
  </div>
</div>

<h2><span class="num">6</span>온보딩 플로우</h2>
<div class="card">
  <div class="flow-step">
    <div class="flow-num">1</div>
    <div><p class="step-title">앱 첫 실행</p><p class="step-desc">공감 메시지로 시작 — "매번 다른 사람한테 어떻게 말해야 할지 헷갈리시죠?"</p></div>
  </div>
  <div class="flow-step">
    <div class="flow-num">2</div>
    <div><p class="step-title">프라이버시 안내</p><p class="step-desc">실명 대신 역할로 저장한다는 점을 명확히 안내 — 이탈 방지를 위한 핵심 단계</p></div>
  </div>
  <div class="flow-step">
    <div class="flow-num">3</div>
    <div><p class="step-title">첫 인물 등록</p><p class="step-desc">타이핑 없이 역할 라벨 + 2~3개 객관식(카톡파/대면파, 결론부터/배경부터)</p></div>
  </div>
  <div class="flow-step">
    <div class="flow-num">4</div>
    <div><p class="step-title">즉각 도움 제공</p><p class="step-desc">"지금 보낼 말 있어요?" — 앱 실행 1분 안에 첫 성공 경험 제공이 핵심 원칙</p></div>
  </div>
  <div class="flow-step">
    <div class="flow-num">5</div>
    <div><p class="step-title">결과 자동 반영</p><p class="step-desc">입력한 내용이 자동으로 인물 프로필의 첫 데이터로 누적</p></div>
  </div>
  <div class="flow-step">
    <div class="flow-num">6</div>
    <div><p class="step-title">다음날 체크인</p><p class="step-desc">"어제 그 얘기 어떻게 됐어요?" 버튼 3개로 최소 마찰 피드백</p></div>
  </div>
</div>
<div class="callout warn">
  가장 위험한 이탈 지점은 <strong>3→4단계 사이</strong>. 온보딩 질문에 답만 하고 실질적 가치를 못 느끼면 바로 이탈하므로, 4단계(즉각 도움)를 최대한 빨리 도달하게 만드는 것이 핵심 설계 원칙.
</div>

<h2><span class="num">7</span>홈 화면 구성</h2>
<div class="card">
  <ul>
    <li><strong>빠른 도움 카드</strong> — 로그인 직후 바로 문장 코칭을 요청할 수 있는 진입점</li>
    <li><strong>체크인 배너</strong> — 전날 상호작용이 있으면 상단에 노출, 버튼 3개로 응답</li>
    <li><strong>인물 카드 목록</strong> — 실명 대신 역할 라벨 아바타 + 그 사람에 대해 이미 파악한 핵심 한 줄</li>
    <li><strong>체크인 대기 태그</strong> — 피드백 미완료 인물을 눈에 띄게 표시해 리텐션 유도</li>
    <li><strong>새 인물 등록 버튼</strong> — 하단에 상시 노출</li>
  </ul>
</div>

<h2><span class="num">8</span>앞으로 남은 논의</h2>
<div class="card">
  <ul>
    <li>인물 상세 프로필 화면 설계</li>
    <li>"즉각 도움" 요청 시 실제 코칭 화면 플로우</li>
    <li>비즈니스 모델 — 구독형 vs 관계/역할별 패키지형</li>
    <li>기술 스택 및 실제 개발 범위 (MVP 스코프 확정)</li>
  </ul>
</div>

<footer>
  이 문서는 기획 브레인스토밍 세션 내용을 정리한 자료이므로 추후 수정될 수 있습니다.
</footer>
`;

export default function App() {
  return (
    <>
      <style>{styles}</style>
      <div className="aiplan" dangerouslySetInnerHTML={{ __html: content }} />
    </>
  );
}
