// 연간결산 보고서 자동화 — 데모 프론트엔드
//
// 화면은 2개뿐이다:
//   ① 워크플로우 — 세무사무소가 하는 일의 지도. 사람이 어디 있는가.
//   ② 시나리오   — 그 흐름을 사용자가 직접 따라가는 체험. 결정 지점 2개.
//
// 설계 원칙 (docs/design.md §4 여백 철학): 한 화면에 핵심 메시지 1개 + 보조 비주얼 1개.

const won = (n) => (n == null ? '—' : Math.round(n).toLocaleString('ko-KR'));

const state = {
  screen: 'flow',
  step: 0,
  q1: null,        // 확인 큐 답변 (null = 아직 결정 안 함)
  combo: null,     // 절세 조합 선택
  busy: false,
  data: null, scenarios: null, impact: null, source: null,
};

// ── 데이터 ────────────────────────────────
async function fetchPipeline() {
  const p = new URLSearchParams();
  if (state.q1) p.set('q1', state.q1);
  if (state.combo) { p.set('방법', state.combo.방법); p.set('연수', state.combo.내용연수); }
  return fetch(`/api/pipeline?${p}`).then((r) => r.json());
}

async function boot() {
  const [data, scenarios, impact, source] = await Promise.all([
    fetchPipeline(),
    fetch('/api/scenarios').then((r) => r.json()),
    fetch('/api/impact').then((r) => r.json()),
    fetch('/api/source').then((r) => r.json()),
  ]);
  Object.assign(state, { data, scenarios, impact, source });
  render();
}

async function refresh() {
  state.busy = true; render();
  state.data = await fetchPipeline();
  state.busy = false; render();
}

// ══════════════════════════════════════════
// 화면 ① 워크플로우
// ══════════════════════════════════════════
// ⚠️ 2026-07-16 팩트체크로 수정됨 — notes/팩트체크-자동화-현황.md
//    이전 버전은 "0단계는 수임동의로 자동 유입", "4단계는 세무사랑Pro가 이미 함"이라고 적었으나
//    조사 결과 전자는 스크래핑 기반 온라인 셀프서비스였고, 후자는 과장이었다.
const 단계지도 = [
  { n: '0단계', name: '원천자료 수집', who: '반자동', desc: '온라인 발급은 되지만 공개 API가 없다. 사람이 로그인·클릭·다운로드해야 한다' },
  { n: '1단계', name: '장부 기록', who: '사람', star: true, desc: '통장 한 줄이 매출인지 보증금인지 판정한다. 1년에 수백~수천 줄' },
  { n: '2단계', name: '결산', who: '기계', desc: '감가상각·선급비용을 계산해 장부를 마감한다' },
  { n: '3단계', name: '결산보고서', who: '기계', desc: '시산표를 재무제표 구조로 재배치한다' },
  { n: '4단계', name: '세무조정', who: '반자동', desc: '서식·계산은 자동. 한도 판단·소득처분은 여전히 사람 몫' },
  { n: '5단계', name: '신고·납부', who: '사람', desc: '세무사 검토·서명. 법적으로 코드가 대신할 수 없다' },
];

function screenFlow() {
  const i = state.impact;
  return `
    <div class="center">
      <div class="eyebrow">워크플로우</div>
      <h1>세무사무소가 1년간 하는 일</h1>
      <p class="lede">
        "이미 다 자동화됐다"는 말은 <strong style="color:var(--text-heading)">사실이 아닙니다.</strong>
        서식과 계산은 자동이지만, <strong style="color:var(--accent-warm)">판정</strong>에는
        전 구간에 사람이 남아 있습니다.
      </p>
    </div>

    <div class="rail">
      ${단계지도.map((s) => {
        const cls = s.who === '기계' ? 'machine' : s.who === '사람' ? 'human' : 'semi';
        return `
        <div class="node ${cls} ${s.star ? 'star' : ''}">
          <div class="node-dot"></div>
          <div class="node-stage">${s.n}</div>
          <div class="node-name">${s.name}</div>
          <div class="node-who ${cls}">${s.who}</div>
          <div class="node-desc">${s.desc}</div>
        </div>`;
      }).join('')}
    </div>

    <div class="insight">
      <div class="insight-q">그럼 세무사무소는 왜 아직 사람을 비싸게 쓰고 있을까?</div>
      <div class="insight-a">
        자료를 <strong>가져오는</strong> 일은 온라인 셀프서비스라 사람이 클릭만 하면 되고,
        아껴봐야 월 몇 분입니다. 진짜 시간은 가져온 자료를
        <strong>판정하는</strong> 데 들어갑니다.
      </div>
      <div class="txn-demo">
        <span>2025-06-01</span><span>입금</span><span style="color:var(--accent-moon)">10,000,000</span><span>임차인C</span>
        <span class="q">← 매출인가? 보증금인가? 차입금인가?</span>
      </div>
      <div class="insight-a">
        이 판정이 세금 <strong>${won(i.세액차이)}원</strong>을 가릅니다.
        AI가 이길 수 있는 지점은 정확히 여기입니다.
      </div>
    </div>

    <div class="facts">
      <div class="fact">
        <div class="fact-k">0단계 — 수집</div>
        <div class="fact-v">건드리지 않는다</div>
        <div class="fact-d">
          온라인 발급은 되지만 <strong>공개 API가 없어</strong> 사람이 클릭해야 합니다.
          그렇다고 자동화하면 안 됩니다 — 국세청이 스크래핑을 단속 중이고(2025.5 IP 차단),
          은행은 법적 회색지대입니다. <strong>얻는 건 월 몇 분</strong>입니다.
        </div>
      </div>
      <div class="fact warm">
        <div class="fact-k">1단계 — 판정</div>
        <div class="fact-v">★ 승부처</div>
        <div class="fact-d">
          수임동의는 <strong>통장 거래내역을 커버하지 않습니다.</strong> 여기가 사람이 남은 자리입니다.
          규칙으로 대부분 잡고 애매한 것만 사람에게 묻는, 학습 루프 구조.
        </div>
      </div>
      <div class="fact">
        <div class="fact-k">4단계 — 세무조정</div>
        <div class="fact-v">생각보다 비어 있다</div>
        <div class="fact-d">
          더존이 <strong>2025년 2월에야</strong> "반나절 걸리던 세무조정을 3분 만에"로 AI를 냈습니다.
          그전엔 수작업이었다는 뜻입니다. 게다가 상용 제품은 전부 <strong>세무사무소용</strong>입니다.
        </div>
      </div>
    </div>

    <div class="cta">
      <button class="btn-solid" data-goto-scenario>이 흐름을 직접 따라가 보기 →</button>
    </div>`;
}

// ══════════════════════════════════════════
// 화면 ② 시나리오 — 9스텝
// ══════════════════════════════════════════
const steps = [
  // ── 0. 시작
  () => {
    const n = state.source.통장내역.length;
    return {
      who: null,
      html: `
        <div class="center">
          <div class="eyebrow">시나리오 시작</div>
          <h1>작년 1년치가 도착했습니다</h1>
          <div class="hero-num cyan">${n}건</div>
          <div class="hero-cap">(주)데모임대 · 2025.1.1 ~ 12.31 · 법인 통장 거래내역</div>
          <p class="note">
            이게 <strong>우리가 가진 전부</strong>입니다. 전표도, 시산표도, 재무제표도 없습니다.
            여기서 출발해 세액까지 갑니다.
          </p>
        </div>`,
      next: '분개 시작 →',
    };
  },

  // ── 1. AI 자동 분개
  () => {
    const st = state.data.stage1.통계;
    const auto = (st.자동확정 / st.총거래) * 100;
    return {
      who: 'machine',
      html: `
        <div class="center">
          <div class="eyebrow">1단계 · 장부 기록</div>
          <h1>AI가 ${st.자동확정}건을 자동 분개했습니다</h1>
        </div>
        <div class="bar">
          <div class="bar-auto" style="width:${auto}%">규칙·증빙 대사로 자동 확정 ${st.자동확정}건</div>
          <div class="bar-human" style="width:${100 - auto}%">${st.사람확인}</div>
        </div>
        <div class="bar-legend">
          <span>매달 반복되는 임대료·급여·이자 — 패턴이 명확</span>
          <span style="color:var(--accent-warm)">판정 불가 ${st.사람확인}건 ←</span>
        </div>
        <p class="note center">
          임대업은 거래 패턴이 단순해서 규칙이 대부분을 먹습니다.
          <strong>문제는 남은 1건</strong>입니다.
        </p>`,
      next: '막힌 1건 보기 →',
    };
  },

  // ── 2. ★ 결정 1: 확인 큐
  () => {
    const q = state.impact;
    const picked = state.q1;
    const ok = picked === '임대보증금';
    const [정답, 오답] = q.케이스;

    return {
      who: 'human',
      decide: true,
      html: `
        <div class="center">
          <div class="eyebrow" style="color:var(--accent-warm)">★ 결정이 필요합니다</div>
          <h1>이 한 줄, 어떻게 판정하시겠어요?</h1>
        </div>
        <div class="txn-card">
          <div class="txn-f"><div class="txn-f-k">일자</div><div class="txn-f-v">2025-06-01</div></div>
          <div class="txn-f"><div class="txn-f-k">구분</div><div class="txn-f-v">입금</div></div>
          <div class="txn-f"><div class="txn-f-k">금액</div><div class="txn-f-v big">10,000,000</div></div>
          <div class="txn-f"><div class="txn-f-k">거래처</div><div class="txn-f-v">임차인C</div></div>
        </div>
        <p class="note center" style="margin-top:0">
          AI가 못 푼 이유: <strong>반복 패턴 없음 · 대사할 세금계산서 없음 · 정기 임대료(800만/500만)와 금액 불일치</strong>
        </p>

        <div class="choices">
          <button class="choice ${picked === '임대보증금' ? 'picked' : ''}" data-q1="임대보증금">
            <div class="choice-t">임대보증금 (부채)</div>
            <div class="choice-d">나중에 돌려줄 돈. 수익이 아니라 부채로 잡힌다.</div>
          </button>
          <button class="choice ${picked === '임대료수입' ? 'picked wrong' : ''}" data-q1="임대료수입">
            <div class="choice-t">임대료수입 (수익)</div>
            <div class="choice-d">받은 돈이니 매출로 잡는다.</div>
          </button>
        </div>

        ${picked ? `
          <div class="reveal ${ok ? 'good' : 'bad'}">
            <div class="reveal-t">${ok ? '✓ 정답입니다. 그런데 만약 AI가 틀렸다면?' : '⚠️ 오분개입니다. 부채를 수익으로 잡았습니다.'}</div>
            <div class="vs">
              <div class="vs-side">
                <div class="vs-k">임대보증금 (정답)</div>
                <div class="vs-v green">${won(정답.총납부액)}</div>
              </div>
              <div class="vs-gap">
                <div class="vs-gap-v">+${won(q.세액차이)}</div>
                <div class="vs-gap-k">세금 차이</div>
              </div>
              <div class="vs-side">
                <div class="vs-k">임대료수입 (오분개)</div>
                <div class="vs-v warm">${won(오답.총납부액)}</div>
              </div>
            </div>
            <p class="note" style="margin-top:4px">
              통장 한 줄의 계정과목 판정이 세금을 직접 가릅니다.
              <strong>이것이 이 프로젝트의 존재 이유</strong>입니다 — 그리고 세무는 틀리면 가산세가 나오기 때문에,
              "대충 맞는 AI"는 실무에서 아무도 안 씁니다.
            </p>
          </div>` : ''}`,
      next: picked ? '이 판정으로 계속 →' : null,
    };
  },

  // ── 3. 결산
  () => {
    const s2 = state.data.stage2;
    return {
      who: 'machine',
      html: `
        <div class="center">
          <div class="eyebrow">2단계 · 결산</div>
          <h1>돈이 안 오간 것들을 얹습니다</h1>
          <p class="lede">전표는 "실제로 돈이 오간 거래"만 담고 있습니다. 결산은 여기에 회계적으로 인식해야 할 것을 더합니다.</p>
        </div>
        <div class="list">
          ${s2.감가.map((d) => `
            <div class="li">
              <span class="li-tag ${d.고정됨 ? '' : 'hold'}">${d.고정됨 ? '법정 강제' : '★ 선택 가능'}</span>
              <span class="li-n">${d.자산}<div class="li-s">${d.방법}법 · ${d.내용연수}년</div></span>
              <span class="li-v">${won(d.금액)}</span>
            </div>`).join('')}
          ${s2.선급.map((p) => `
            <div class="li">
              <span class="li-tag">일할 안분</span>
              <span class="li-n">${p.계약}<div class="li-s">미경과분을 자산으로 대체</div></span>
              <span class="li-v">${won(p.금액)}</span>
            </div>`).join('')}
        </div>
        <p class="note center">
          시산표 대차평형 <strong style="color:var(--accent-green)">통과</strong> —
          하지만 이건 <strong>전기(轉記) 오류만</strong> 잡습니다.
          방금 그 계정 착오는 대차가 맞아도 안 잡힙니다. 그래서 정답지가 필요합니다.
        </p>`,
      next: '재무제표 →',
    };
  },

  // ── 4. 재무제표
  () => {
    const pl = state.data.stage3.손익계산서;
    const bs = state.data.stage3.재무상태표;
    return {
      who: 'machine',
      html: `
        <div class="center">
          <div class="eyebrow">3단계 · 결산보고서</div>
          <h1>재무제표가 나왔습니다</h1>
          <div class="hero-num">${won(pl.당기순이익)}</div>
          <div class="hero-cap">당기순이익 · 매출 ${won(pl.매출액)} − 비용</div>
        </div>
        <div class="ladder">
          <div class="rung"><span class="rung-op"></span><span class="rung-k">자산총계</span><span class="rung-v">${won(bs.자산.총계)}</span></div>
          <div class="rung"><span class="rung-op">=</span><span class="rung-k">부채와자본총계</span><span class="rung-v">${won(bs.부채와자본총계)}</span></div>
        </div>
        <p class="note center">
          자산 = 부채 + 자본이 <strong>우연이 아니라 필연</strong>입니다.
          데모의 숫자를 하드코딩하지 않고 통장에서 실제로 계산했기 때문입니다.
        </p>`,
      next: '세무조정 →',
    };
  },

  // ── 5. 세무조정
  () => {
    const s4 = state.data.stage4;
    return {
      who: 'machine',
      html: `
        <div class="center">
          <div class="eyebrow">4단계 · 세무조정</div>
          <h1>회계이익을 과세소득으로 바꿉니다</h1>
          <p class="lede">기업회계는 "경영성과"를 재고, 세법은 "담세력"을 잽니다. 그 차이를 항목별로 가감합니다.</p>
        </div>
        <div class="list">
          ${s4.조정.map((a) => `
            <div class="li">
              <span class="li-tag ${a.소득처분 === '유보' ? 'hold' : 'out'}">${a.소득처분}</span>
              <span class="li-n">${a.과목}</span>
              <span class="li-v">+${won(a.금액)}</span>
            </div>`).join('')}
        </div>
        <p class="note center">
          <strong>유보</strong>는 차이가 회사 안에 남아 다음 해로 이월된다는 뜻입니다 —
          연도 간 연속성 관리가 필요합니다. 이 ${s4.조정.length}건은 전부
          <strong>근거 조문과 함께</strong> 자동 생성됐습니다.
        </p>`,
      next: '세액 계산 →',
    };
  },

  // ── 6. 세액 확정
  () => {
    const b = state.data.stage4.별지3;
    const 지방 = state.data.stage4.지방소득세;
    // 0원짜리 비강조 항목(이월결손금·공제감면·가산세)은 노이즈라 뺀다
    const rungs = b.단계.filter((s) => s.강조 || s.금액 == null || s.금액 !== 0);
    return {
      who: 'machine',
      html: `
        <div class="center">
          <div class="eyebrow">4단계 · 별지 제3호</div>
          <h1>세액이 확정됐습니다</h1>
        </div>
        <div class="ladder">
          ${rungs.map((s) => `
            <div class="rung ${s.최종 ? 'final' : s.강조 ? 'key' : ''}">
              <span class="rung-op">${s.부호}</span>
              <span class="rung-k">${s.라벨}</span>
              <span class="rung-v">${s.금액 == null ? '9%' : won(s.금액)}</span>
            </div>`).join('')}
          <div class="rung"><span class="rung-op">+</span><span class="rung-k">법인지방소득세 (위택스 별도 신고)</span><span class="rung-v">${won(지방.산출세액)}</span></div>
          <div class="rung final"><span class="rung-op">=</span><span class="rung-k">총 납부액</span><span class="rung-v">${won(state.data.stage5.총납부액)}</span></div>
        </div>
        <p class="note center">
          통장 ${state.source.통장내역.length}건에서 여기까지, <strong>사람이 개입한 건 딱 1번</strong>입니다.
          법인세비용은 순환 참조(세액→비용→순이익→세액)라 반복 계산으로
          <strong>${state.data.수렴.반복횟수}회차에 수렴</strong>했습니다.
        </p>`,
      next: '세금을 줄일 수 있을까? →',
    };
  },

  // ── 7. ★ 결정 2: 절세 시나리오
  () => {
    const s = state.scenarios;
    const min = Math.min(...s.결과.map((r) => r.총납부액));
    const max = Math.max(...s.결과.map((r) => r.총납부액));
    const picked = state.combo;
    return {
      who: 'human',
      decide: true,
      html: `
        <div class="center">
          <div class="eyebrow" style="color:var(--accent-warm)">★ 결정이 필요합니다</div>
          <h1>비품 상각방법을 고를 수 있습니다</h1>
          <p class="lede">
            건물과 승용차는 <strong>법이 방법을 강제</strong>합니다. 당기 신규 취득한 비품만
            선택할 수 있고, 적법한 조합은 ${s.결과.length}개입니다.
          </p>
        </div>
        <div class="combos">
          ${s.결과.map((r) => {
            const w = max === min ? 100 : 20 + ((max - r.총납부액) / (max - min)) * 80;
            const on = picked && picked.방법 === r.방법 && picked.내용연수 === r.내용연수;
            return `
              <button class="combo ${on ? 'picked' : ''}" data-combo="${r.방법}|${r.내용연수}">
                <span class="combo-n">${r.조합}</span>
                <span class="combo-bar"><span class="combo-fill" style="width:${w}%"></span></span>
                <span class="combo-v">${won(r.총납부액)}</span>
                <span class="combo-d ${r.기준대비 < 0 ? 'down' : r.기준대비 > 0 ? 'up' : ''}">${r.기준대비 === 0 ? '기준' : (r.기준대비 > 0 ? '+' : '') + won(r.기준대비)}</span>
              </button>`;
          }).join('')}
        </div>
        <div class="warn">
          <div class="warn-t">⚠️ 이건 절세가 아니라 과세이연입니다</div>
          <div class="warn-d">
            비품 취득가 1,000만원은 <strong>어느 방법을 택하든 5년에 걸쳐 전액 손금</strong>이 됩니다.
            올해 많이 상각하면 내년 이후 상각비가 줄어 세금이 늘어납니다.
            유리한 건 "돈을 늦게 내는 것"이지 "덜 내는 것"이 아닙니다.
            게다가 한 번 신고한 방법은 <strong>계속 적용이 원칙</strong>이라 올해 선택이 내년 이후를 구속합니다.
          </div>
        </div>
        <p class="note center">
          법정 강제로 <strong>변수 공간에서 배제된 것</strong>:
          ${s.배제된변수.map((v) => `${v.자산}(${v.고정값})`).join(' · ')} —
          건물에 정률법을 억지로 주입해도 코드가 무시합니다.
        </p>`,
      next: picked ? '초안 완성 →' : '기준값(정액 5년)으로 계속 →',
    };
  },

  // ── 8. 완료
  () => {
    const s5 = state.data.stage5;
    const b = state.data.stage4.별지3;
    return {
      who: null,
      html: `
        <div class="center">
          <div class="eyebrow" style="color:var(--accent-green)">완료</div>
          <h1>세무사 전달용 초안이 나왔습니다</h1>
          <div class="hero-num green">${won(s5.총납부액)}</div>
          <div class="hero-cap">법인세 ${won(b.차감납부세액)} + 지방소득세 ${won(state.data.stage4.지방소득세.산출세액)}</div>
        </div>
        <div class="list" style="max-width:620px;margin:28px auto">
          <div class="li"><span class="li-tag">자동</span><span class="li-n">전표 ${state.data.stage1.전표.length}건<div class="li-s">통장에서 분개 생성</div></span><span class="li-v" style="color:var(--accent-cyan)">기계</span></div>
          <div class="li"><span class="li-tag">자동</span><span class="li-n">재무제표 · 시산표<div class="li-s">결산수정분개 포함</div></span><span class="li-v" style="color:var(--accent-cyan)">기계</span></div>
          <div class="li"><span class="li-tag">자동</span><span class="li-n">세무조정 ${state.data.stage4.조정.length}건 + 별지3<div class="li-s">근거 조문 포함</div></span><span class="li-v" style="color:var(--accent-cyan)">기계</span></div>
          <div class="li"><span class="li-tag out">사람</span><span class="li-n">분개 판정 1건 · 상각방법 선택<div class="li-s">AI가 못 정하는 것</div></span><span class="li-v" style="color:var(--accent-warm)">2번</span></div>
          <div class="li"><span class="li-tag out">사람</span><span class="li-n">검토 · 서명 · 전자신고<div class="li-s">법적으로 대체 불가</div></span><span class="li-v" style="color:var(--accent-warm)">세무사</span></div>
        </div>
        <div class="warn">
          <div class="warn-t">여기까지가 자동화의 범위입니다</div>
          <div class="warn-d">
            ${s5.경고}<br><br>
            접수증·납부서는 <strong>신고 행위의 부산물</strong>이라 만드는 대상이 아닙니다.
            성실신고확인은 세무사 서명이 법적 필수라 코드가 대신할 수 없습니다.
          </div>
        </div>
        <p class="note center">
          <strong>이 데모의 한계</strong>: mock이라 "정답"을 우리가 정했습니다.
          실제 프로젝트에서는 <strong>종이 연간결산 보고서가 채점표</strong>가 됩니다 —
          AI 분개 결과를 실제 재무제표와 대조해 "얼마나 맞나"를 말할 수 있어야 팔립니다.
        </p>`,
      next: null,
    };
  },
];

function screenScenario() {
  const s = steps[state.step]();
  const decideSteps = [2, 7];

  return `
    <div class="progress">
      ${steps.map((_, i) => `
        <div class="pstep ${i < state.step ? 'done' : ''} ${i === state.step ? 'now' : ''} ${decideSteps.includes(i) ? 'decide' : ''}">
          <div class="pdot">${decideSteps.includes(i) ? '★' : i < state.step ? '✓' : i}</div>
          ${i < steps.length - 1 ? '<div class="pline"></div>' : ''}
        </div>`).join('')}
    </div>

    <div class="stage">
      ${s.who ? `<div class="who-tag ${s.who}">${s.who === 'machine' ? '기계가 처리 중' : '★ 사람이 결정해야 함'}</div>` : ''}
      ${state.busy ? '<div class="loading">다시 계산 중…</div>' : s.html}
    </div>

    <div class="nav-row">
      ${state.step > 0 ? '<button class="btn-outline" data-step="-1">← 이전</button>' : ''}
      ${s.next ? `<button class="btn-solid" data-step="1">${s.next}</button>` : ''}
      ${state.step === steps.length - 1 ? '<button class="btn-outline" data-restart>처음부터 다시</button>' : ''}
    </div>`;
}

// ── 렌더 ──────────────────────────────────
function render() {
  document.getElementById('main').innerHTML =
    state.screen === 'flow' ? screenFlow() : screenScenario();
  document.querySelectorAll('.switch-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.screen === state.screen));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('click', async (e) => {
  const sw = e.target.closest('[data-screen]');
  if (sw) { state.screen = sw.dataset.screen; render(); return; }

  if (e.target.closest('[data-goto-scenario]')) { state.screen = 'scenario'; state.step = 0; render(); return; }
  if (e.target.closest('[data-restart]')) {
    Object.assign(state, { step: 0, q1: null, combo: null });
    await refresh(); return;
  }

  const st = e.target.closest('[data-step]');
  if (st) {
    state.step = Math.max(0, Math.min(steps.length - 1, state.step + Number(st.dataset.step)));
    render(); return;
  }

  const q = e.target.closest('[data-q1]');
  if (q) { state.q1 = q.dataset.q1; await refresh(); return; }

  const c = e.target.closest('[data-combo]');
  if (c) {
    const [방법, 연수] = c.dataset.combo.split('|');
    state.combo = { 방법, 내용연수: Number(연수) };
    await refresh(); return;
  }
});

boot();
