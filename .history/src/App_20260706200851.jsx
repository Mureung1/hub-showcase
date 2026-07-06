import React from 'react';

function App() {
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      background: '#f5f6f5',
      color: '#191919',
      lineHeight: '1.7',
      maxWidth: '820px',
      margin: '0 auto',
      padding: '3rem 1.5rem 6rem'
    }}>
      <header style={{ marginBottom: '3rem', borderBottom: '1px solid #e3e5e1', paddingBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin_bottom: '14px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#03c75a' }}></div>
          <p style={{ fontSize: '13px', color: '#8e8e8e', margin: 0, letterSpacing: '0.02em' }}>
            AI 에이전트 기획 노트 · 2026.07.06
          </p>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: '600', margin: '0 0 12px' }}>관계 맞춤형 화법 코치</h1>
        <p style={{ fontSize: '16px', color: '#5c5c5c', margin: 0 }}>
          매번 다른 사람, 매번 다른 상황에서 어떻게 말해야 할지 헷갈릴 때, 표현을 도와주는 AI 코치
        </p>
        <p style={{ fontSize: '12.5px', color: '#8e8e8e', marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #e3e5e1' }}>
          ※ 본 문서는 브레인스토밍 초기 단계의 기획 자료이며, 이후 논의에 따라 방향과 세부 내용이 바뀔 수 있습니다.
        </p>
      </header>

      {/* 1. 문제의식 */}
      <h2 style={{ fontSize: '20px', fontWeight: '600', margin: '3rem 0 1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justify_content: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#03c75a', color: '#fff', fontSize: '13px', fontWeight: '700' }}>1</span>
        문제의식: 왜 이 영역인가
      </h2>
      <div style={{ background: '#ffffff', border: '1px solid #e3e5e1', borderRadius: '12px', padding: '1.25rem 1.5rem', margin: '1rem 0' }}>
        <p style={{ margin: '0.5rem 0' }}>출발점은 언어 문제였다 — 사회초년생들이 예의를 지켜야 하는 상황에서 말실수를 하거나, AI 의존도가 높아지며 언어 표현 능력 자체가 줄어드는 현상. 여기서 더 나아가 "AI가 대신 해주면서 사람의 고유 능력이 퇴화하는" 더 넓은 문제군을 탐색했다.</p>
      </div>

      {/* 2. 탐색한 아이디어들 */}
      <h2 style={{ fontSize: '20px', fontWeight: '600', margin: '3rem 0 1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justify_content: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#03c75a', color: '#fff', fontSize: '13px', fontWeight: '700' }}>2</span>
        탐색한 아이디어들
      </h2>
      <p style={{ fontSize: '14px', color: '#5c5c5c' }}>언어·감정·의료·개성 등 여러 축으로 브레인스토밍을 진행하며 나온 아이디어들. 최종 선택은 초록, 후보로 고려했던 것은 노랑, 기각한 것은 흐리게 표시.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', margin: '1rem 0' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e3e5e1', borderRadius: '10px', padding: '1rem 1.1rem' }}>
          <span style={{ display: 'inline-block', fontSize: '11px', padding: '3px 9px', borderRadius: '6px', marginBottom: '8px', fontWeight: '500', background: '#e5f9ed', color: '#029b46' }}>최종 선택</span>
          <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 6px' }}>언어/커뮤니케이션 코칭</p>
          <p style={{ fontSize: '13px', color: '#5c5c5c', margin: 0 }}>직장인 상황별 톤·표현 코칭. 관계 맞춤형으로 재설계하여 최종 컨셉으로 채택.</p>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e3e5e1', borderRadius: '10px', padding: '1rem 1.1rem' }}>
          <span style={{ display: 'inline-block', fontSize: '11px', padding: '3px 9px', borderRadius: '6px', marginBottom: '8px', fontWeight: '500', background: '#fdf1de', color: '#a15c00' }}>유력 후보였음</span>
          <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 6px' }}>AI 정서 아웃소싱 의존 인지</p>
          <p style={{ fontSize: '13px', color: '#5c5c5c', margin: 0 }}>힘들 때 AI에게만 하소연하는 습관을 인지시키고 실제 사람에게 표현하도록 돕는 메타 코칭.</p>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e3e5e1', borderRadius: '10px', padding: '1rem 1.1rem', opacity: 0.55 }}>
          <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 6px' }}>정신적 피로 회복 코치</p>
          <p style={{ fontSize: '13px', color: '#5c5c5c', margin: 0 }}>정신적 피로를 AI에게 털어놓으며 회복 탄력성을 되찾아주는 코치.</p>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e3e5e1', borderRadius: '10px', padding: '1rem 1.1rem', opacity: 0.55 }}>
          <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 6px' }}>개성 지키기 — 문체 지킴이 / 취향 지문</p>
          <p style={{ fontSize: '13px', color: '#5c5c5c', margin: 0 }}>AI가 획일화시키는 문체·취향·창작을 지켜주는 도구군. 별도 확장 아이디어로 보류.</p>
        </div>
      </div>

      {/* 3. 핵심 의사결정 */}
      <h2 style={{ fontSize: '20px', fontWeight: '600', margin: '3rem 0 1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justify_content: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#03c75a', color: '#fff', fontSize: '13px', fontWeight: '700' }}>3</span>
        핵심 의사결정: 왜 언어 코칭 단독인가
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', margin: '1rem 0', background: '#ffffff', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e3e5e1' }}>
        <thead>
          <tr style={{ background: '#e5f9ed' }}>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#029b46', fontSize: '12px' }}></th>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#029b46', fontSize: '12px' }}>A. 언어 코칭</th>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', color: '#029b46', fontSize: '12px' }}>B. 감정 처리</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '10px 14px', borderBottom: '1px solid #e3e5e1' }}>니즈의 명확성</td>
            <td style={{ padding: '10px 14px', borderBottom: '1px solid #e3e5e1' }}>명확함 (그 사람과 잘 지내고 싶다)</td>
            <td style={{ padding: '10px 14px', borderBottom: '1px solid #e3e5e1' }}>다소 막연함 (자각이 선행돼야 함)</td>
          </tr>
          <tr>
            <td style={{ padding: '10px 14px', borderBottom: '1px solid #e3e5e1' }}>지속 사용 이유</td>
            <td style={{ padding: '10px 14px', borderBottom: '1px solid #e3e5e1' }}>관계가 바뀔 때마다 재사용</td>
            <td style={{ padding: '10px 14px', borderBottom: '1px solid #e3e5e1' }}>습관 재발형이라 관리형으로 지속 가능</td>
          </tr>
          <tr>
            <td style={{ padding: '10px 14px', borderBottom: '1px solid #e3e5e1' }}>개발 난이도</td>
            <td style={{ padding: '10px 14px', borderBottom: '1px solid #e3e5e1' }}>중간 (관계별 기록·패턴화 필요)</td>
            <td style={{ padding: '10px 14px', borderBottom: '1px solid #e3e5e1' }}>낮음 (대화 + 넛지 위주)</td>
          </tr>
          <tr>
            <td style={{ padding: '10px 14px', borderBottom: 'none' }}>경쟁 강도</td>
            <td style={{ padding: '10px 14px', borderBottom: 'none' }}>낮음 (관계 맞춤형 화법 코칭은 드묾)</td>
            <td style={{ padding: '10px 14px', borderBottom: 'none' }}>중간 (멘탈케어 앱들과 일부 겹침)</td>
          </tr>
        </tbody>
      </table>
      <div style={{ background: '#e5f9ed', borderLeft: '4px solid #03c75a', borderRadius: '0 10px 10px 0', padding: '1rem 1.25rem', fontSize: '14px', color: '#029b46', margin: '1rem 0' }}>
        두 축을 합치는 방안도 논의했으나, 온보딩 메시지가 애매해지고 타겟이 갈라지는 문제로 <strong>초기 단계에서는 하나만 뾰족하게 파는 것으로 결정</strong>. 언어 코칭을 "관계 맞춤형"으로 재설계하면 기존 화법 코칭의 약점(감 잡히면 이탈)을 상당 부분 해결할 수 있다고 판단.
      </div>

      {/* 4. 최종 컨셉 */}
      <h2 style={{ fontSize: '20px', fontWeight: '600', margin: '3rem 0 1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justify_content: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#03c75a', color: '#fff', fontSize: '13px', fontWeight: '700' }}>4</span>
        최종 컨셉
      </h2>
      <div style={{ background: '#ffffff', border: '1px solid #e3e5e1', borderRadius: '12px', padding: '1.25rem 1.5rem', margin: '1rem 0' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 0.5rem' }}>한 줄 정의</h3>
        <p>일반적인 화법 지식이 아니라, <strong>특정 사람과의 관계에서 매번 달라지는 화법을 계속 기록하고 도와주는 코치.</strong></p>
        <h3 style={{ fontSize: '15px', fontWeight: '600', margin: '1.5rem 0 0.5rem' }}>핵심 데이터 구조</h3>
        <p>제품의 핵심 자산은 "인물 프로필"이다. 실명 대신 역할(직속상사, A거래처)로 저장하고, 대화 후 짧은 리뷰만 남기면 자동으로 프로필이 누적된다.</p>
        <h3 style={{ fontSize: '15px', fontWeight: '600', margin: '1.5rem 0 0.5rem' }}>핵심 루프</h3>
        <ul style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
          <li style={{ margin: '4px 0', fontSize: '14.5px' }}><strong>사전:</strong> "오늘 이 사람한테 어떻게 말할까요?" → 프로필 기반 표현 제안 + 리허설</li>
          <li style={{ margin: '4px 0', fontSize: '14.5px' }}><strong>직후:</strong> "어떻게 됐어요?" 한 줄 피드백 → 프로필에 자동 반영</li>
          <li style={{ margin: '4px 0', fontSize: '14.5px' }}><strong>화면 누적:</strong> 몇 주 후 그 사람과의 대화 패턴 요약본 형성</li>
        </ul>
      </div>

      {/* 5. 리스크와 해결 방향 */}
      <h2 style={{ fontSize: '20px', fontWeight: '600', margin: '3rem 0 1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justify_content: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#03c75a', color: '#fff', fontSize: '13px', fontWeight: '700' }}>5</span>
        핵심 리스크와 해결 방향
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e3e5e1', borderRadius: '10px', padding: '1rem 1.1rem' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#c0392b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '6px' }}>① 프라이버시 민감성</p>
          <p style={{ fontSize: '14px', margin: '0.5rem 0' }}>상사·동료에 대한 평가성 기록을 저장한다는 부담감.</p>
          <p style={{ fontSize: '13px', color: '#5c5c5c', margin: '6px 0 0', paddingTop: '6px', borderTop: '1px dashed #e3e5e1' }}>해결: 실명 대신 역할 라벨만 저장, 타인 평가가 아닌 "내 행동 기록"으로 프레이밍, 로컬 저장 우선, 관계 종료 시 일괄 삭제 가능.</p>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e3e5e1', borderRadius: '10px', padding: '1rem 1.1rem' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#c0392b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '6px' }}>② 콜드스타트 문제</p>
          <p style={{ fontSize: '14px', margin: '0.5rem 0' }}>초반엔 그 사람에 대한 데이터가 없어 일반론으로만 시작.</p>
          <p style={{ fontSize: '13px', color: '#5c5c5c', margin: '6px 0 0', paddingTop: '6px', borderTop: '1px dashed #e3e5e1' }}>해결: 온보딩에서 2~3개 객관식으로 가벼운 초기 데이터 확보, 유형별 템플릿 선先 제공, 첫날 즉각적인 원샷 도움으로 빠른 성공 경험 제공.</p>
        </div>
      </div>

      <footer style={{ marginTop: '4rem', paddingTop: '1.5rem', borderTop: '1px solid #e3e5e1', fontSize: '12px', color: '#8e8e8e', textAlign: 'center' }}>
        이 문서는 기획 브레인스토밍 세션 내용을 정리한 자료이므로 추후 수정될 수 있습니다.
      </footer>
    </div>
  );
}

export default App;