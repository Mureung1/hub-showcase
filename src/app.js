const STORAGE_KEY = "openseed_interactive_prototype_v1";

const companies = ["Naver Cloud", "Kakao Ventures", "Woowa", "Hyundai Card", "CJ OliveNetworks"];
let currentView = "ranking";
let selectedIdeaId = null;
let activeCategory = "전체";
let selectedCandidate = 0;

const money = new Intl.NumberFormat("ko-KR");

function makeDefaultState() {
  return {
    user: {
      id: "u-demo",
      name: "민서",
      points: 3600,
      likedIdeaIds: ["idea-1"],
      viewedIdeaIds: [],
      feedbackRewardedIdeaIds: [],
    },
    investments: [
      { ideaId: "idea-1", points: 900, entryPrice: 142, quantity: 6.338, createdAt: "2026-07-09 18:20" },
      { ideaId: "idea-3", points: 450, entryPrice: 117, quantity: 3.846, createdAt: "2026-07-10 09:10" },
    ],
    pointHistory: [
      { type: "starter", amount: 3000, text: "첫 로그인 기본 Seed Point 지급", at: "2026-07-09 09:00" },
      { type: "invest", amount: -900, text: "동네 소상공인 재고 플랫폼에 투자", at: "2026-07-09 18:20" },
      { type: "reward", amount: 500, text: "기업 관심 신호 보너스", at: "2026-07-10 10:14" },
    ],
    ideas: [
      {
        id: "idea-1",
        title: "동네 소상공인 당일 재고 공동 판매 플랫폼",
        category: "로컬",
        visibility: "공개형",
        maturity: "Business Ready",
        author: "하린",
        summary: "폐기될 상품을 근처 소비자와 기업 복지몰에 연결해 재고 손실을 줄이는 서비스입니다.",
        problem: "소상공인은 마감 직전 재고를 처리하기 어렵고, 소비자는 저렴한 근거리 상품을 찾기 어렵습니다.",
        target: "동네 베이커리, 반찬가게, 꽃집, 근처 직장인과 1인 가구",
        solution: "가게가 마감 상품을 등록하면 근처 소비자가 예약 구매하고, 기업 복지몰은 단체 쿠폰으로 연결됩니다.",
        businessModel: "가게용 월 구독, 거래 수수료, 기업 복지몰 제휴 광고",
        seedInvested: 128400,
        investors: 231,
        companyInterests: ["Naver Cloud", "Woowa", "Hyundai Card"],
        likes: 2931,
        views: 18420,
        trend: 23.8,
        timeline: [
          ["2026.07.06", "최초 아이디어 등록"],
          ["2026.07.07", "베이커리 중심으로 고객군 좁힘"],
          ["2026.07.09", "기업 복지몰 제휴 모델 추가"],
        ],
        feedback: [
          { id: "fb-1", author: "준호", type: "고객군", text: "음식점 전체보다 베이커리와 꽃집을 먼저 잡으면 폐기율과 긴급성이 명확합니다.", accepted: true },
          { id: "fb-2", author: "서연", type: "수익모델", text: "초기에는 거래 수수료보다 POS 연동 리포트 구독이 더 안정적일 수 있습니다.", accepted: false },
        ],
      },
      {
        id: "idea-2",
        title: "직장인 사이드 프로젝트 팀빌딩 매칭",
        category: "커뮤니티",
        visibility: "매칭형 공개",
        maturity: "Prototype Ready",
        author: "도윤",
        summary: "아이디어 성숙도와 기여 이력을 기반으로 기획자, 개발자, 디자이너를 연결합니다.",
        problem: "사이드 프로젝트를 시작하고 싶어도 검증된 아이디어와 신뢰할 팀원을 찾기 어렵습니다.",
        target: "예비 창업자, 포트폴리오 목적의 주니어, 직장인 빌더",
        solution: "아이디어 랭킹, 기여 이력, 역할별 참여 신청을 한 흐름으로 연결합니다.",
        businessModel: "기업 채용 브랜딩, 팀빌딩 프리미엄, 후원 프로젝트 광고",
        seedInvested: 96850,
        investors: 168,
        companyInterests: ["Kakao Ventures", "CJ OliveNetworks"],
        likes: 1784,
        views: 11940,
        trend: 16.2,
        timeline: [
          ["2026.07.04", "팀빌딩 매칭 초안 등록"],
          ["2026.07.08", "기여자 평판 지표 추가"],
        ],
        feedback: [
          { id: "fb-3", author: "민서", type: "실행난이도", text: "매칭 전 2주짜리 미니 검증 과제를 붙이면 팀 이탈을 줄일 수 있습니다.", accepted: false },
        ],
      },
      {
        id: "idea-3",
        title: "AI 기반 1인 가구 식단 실험 커뮤니티",
        category: "AI",
        visibility: "반공개형",
        maturity: "Validated Problem",
        author: "서연",
        summary: "냉장고 재료, 편의점 조합, 건강 목표를 연결한 식단 추천과 검증 커뮤니티입니다.",
        problem: "1인 가구는 식재료를 남기기 쉽고 건강한 식단을 지속하기 어렵습니다.",
        target: "자취생, 1인 직장인, 다이어트와 건강관리에 관심 있는 사용자",
        solution: "보유 재료와 목표를 입력하면 AI가 조합을 제안하고, 커뮤니티가 맛과 지속성을 검증합니다.",
        businessModel: "식품 브랜드 스폰서, 프리미엄 식단 리포트, 편의점 제휴",
        seedInvested: 88120,
        investors: 147,
        companyInterests: ["CJ OliveNetworks"],
        likes: 1431,
        views: 10330,
        trend: 11.7,
        timeline: [
          ["2026.07.05", "냉장고 재료 기반 아이디어 등록"],
          ["2026.07.09", "편의점 조합 기능 추가"],
        ],
        feedback: [
          { id: "fb-4", author: "하린", type: "시장성", text: "편의점 브랜드와의 캠페인으로 초기 유입을 만들 수 있어 보입니다.", accepted: true },
        ],
      },
      {
        id: "idea-4",
        title: "소상공인 리뷰 답변 자동 코파일럿",
        category: "AI",
        visibility: "공개형",
        maturity: "Seed Idea",
        author: "유진",
        summary: "리뷰 감정과 재방문 가능성을 분석해 가게별 답변 톤을 제안하는 도구입니다.",
        problem: "소상공인은 리뷰에 답변할 시간이 부족하고 부정 리뷰 대응 방식에 어려움을 겪습니다.",
        target: "카페, 미용실, 학원, 병원 등 리뷰 의존도가 높은 로컬 매장",
        solution: "리뷰 수집, 감정 분석, 답변 초안 생성, 재방문 쿠폰 제안을 묶습니다.",
        businessModel: "월 구독, 리뷰 분석 리포트, 매장용 CRM 연동",
        seedInvested: 51200,
        investors: 92,
        companyInterests: [],
        likes: 980,
        views: 7200,
        trend: 7.4,
        timeline: [["2026.07.08", "문제 정의 등록"]],
        feedback: [],
      },
    ],
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return makeDefaultState();
  try {
    return { ...makeDefaultState(), ...JSON.parse(raw) };
  } catch {
    return makeDefaultState();
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nowText() {
  return new Date().toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function pointLog(type, amount, text) {
  state.pointHistory.unshift({ type, amount, text, at: nowText() });
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function scoreIdea(idea) {
  const accepted = idea.feedback.filter((item) => item.accepted).length;
  const investmentScore = Math.log10(idea.seedInvested + 1) * 90 + idea.investors * 1.7;
  const companyScore = idea.companyInterests.length * 95;
  const reactionScore = idea.likes * 0.09 + idea.views * 0.012;
  const contributionScore = idea.feedback.length * 18 + accepted * 70;
  const growthScore = Math.max(-20, idea.trend) * 16;
  return investmentScore + companyScore + reactionScore + contributionScore + growthScore;
}

function derivedIdeas() {
  const scored = state.ideas.map((idea) => ({ ...idea, score: scoreIdea(idea) }));
  const maxScore = Math.max(...scored.map((idea) => idea.score), 1);
  return scored
    .map((idea) => ({
      ...idea,
      price: Math.max(60, Math.round(78 + (idea.score / maxScore) * 72 + idea.trend * 0.7)),
      acceptedCount: idea.feedback.filter((item) => item.accepted).length,
    }))
    .sort((a, b) => b.score - a.score);
}

function getIdea(id) {
  return state.ideas.find((idea) => idea.id === id);
}

function getDerivedIdea(id) {
  return derivedIdeas().find((idea) => idea.id === id);
}

function portfolioValue() {
  return Math.round(
    state.investments.reduce((sum, item) => {
      const idea = getDerivedIdea(item.ideaId);
      return sum + (idea ? item.quantity * idea.price : 0);
    }, 0),
  );
}

function updateWallet() {
  const strip = document.getElementById("walletStrip");
  strip.innerHTML = `
    <span>보유 Seed Point</span><b>${money.format(Math.round(state.user.points))} P</b>
    <span>투자 평가액</span><b>${money.format(portfolioValue())} P</b>
  `;
}

function setView(view, ideaId) {
  currentView = view;
  if (ideaId) selectedIdeaId = ideaId;
  document.querySelectorAll(".nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  render();
}

function filteredIdeas() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  return derivedIdeas().filter((idea) => {
    const categoryOk = activeCategory === "전체" || idea.category === activeCategory;
    const haystack = [idea.title, idea.summary, idea.category, idea.companyInterests.join(" ")].join(" ").toLowerCase();
    return categoryOk && (!query || haystack.includes(query));
  });
}

function renderRanking() {
  const ideas = filteredIdeas();
  const allIdeas = derivedIdeas();
  const topIdea = allIdeas[0];
  const totalInvested = state.ideas.reduce((sum, idea) => sum + idea.seedInvested, 0);
  const totalCompanySignals = state.ideas.reduce((sum, idea) => sum + idea.companyInterests.length, 0);
  const totalFeedback = state.ideas.reduce((sum, idea) => sum + idea.feedback.length, 0);
  const contributors = [...state.ideas]
    .flatMap((idea) => idea.feedback.filter((item) => item.accepted).map((item) => item.author))
    .reduce((acc, name) => ({ ...acc, [name]: (acc[name] || 0) + 1 }), {});
  const contributorRows = Object.entries(contributors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count], index) => `<li><b>${index + 1}. ${name}</b><small>채택 기여 ${count}건</small></li>`)
    .join("");

  return `
    <section class="hero-board">
      <div class="hero-copy">
        <span class="eyebrow">Live Idea League</span>
        <h1>아이디어를 올리고, 반응으로 시장성을 확인하세요</h1>
        <p>DACON식 랭킹과 Linkareer식 탐색 흐름을 결합해 사업 아이디어를 가볍게 둘러보고, Seed Point와 기업 관심으로 검증 신호를 확인합니다.</p>
        <div class="hero-actions">
          <button class="primary-button" data-view="create">아이디어 등록</button>
          <button class="secondary-button" data-view="portfolio">내 Seed Point 보기</button>
        </div>
      </div>
      <div class="hero-stats">
        <div><span>총 가상 투자</span><b>${money.format(totalInvested)} P</b></div>
        <div><span>인증 기업 관심</span><b>${totalCompanySignals}개</b></div>
        <div><span>누적 피드백</span><b>${totalFeedback}건</b></div>
      </div>
    </section>

    <div class="view-header list-toolbar">
      <div>
        <span class="eyebrow">Real-time Ranking</span>
        <h1>실시간 시장 반응 랭킹</h1>
      </div>
      <div class="tabs">
        ${["전체", "AI", "로컬", "커뮤니티"].map((category) => `<button class="${activeCategory === category ? "active" : ""}" data-category="${category}">${category}</button>`).join("")}
      </div>
    </div>
    <div class="grid-2">
      <section class="ranking-list">
        <div class="ranking-head">
          <span>순위</span>
          <span>아이디어</span>
          <span>시장 반응 지표</span>
          <span>참여</span>
        </div>
        ${ideas
          .map((idea, index) => `
            <article class="rank-row">
              <div class="rank-no">${index + 1}</div>
              <div>
                <div class="idea-title">
                  <h2>${idea.title}</h2>
                  <span class="badge ${idea.visibility === "공개형" ? "teal" : idea.visibility === "매칭형 공개" ? "blue" : "gray"}">${idea.visibility}</span>
                  <span class="badge gold">${idea.maturity}</span>
                </div>
                <p class="idea-summary">${idea.summary}</p>
                <div class="meta-line">
                  <span>작성자 ${idea.author}</span>
                  <span>${idea.category}</span>
                  <span>조회 ${money.format(idea.views)}</span>
                </div>
              </div>
              <div class="metric-grid">
                <div class="metric"><span>Seed Index</span><b>${Math.round(idea.score)}</b></div>
                <div class="metric"><span>현재가</span><b>${idea.price} P</b></div>
                <div class="metric"><span>가상 투자</span><b>${money.format(idea.seedInvested)}</b></div>
                <div class="metric"><span>기업 관심</span><b>${idea.companyInterests.length}</b></div>
                <div class="metric"><span>상승률</span><b class="${idea.trend >= 0 ? "trend-up" : "trend-down"}">${idea.trend >= 0 ? "+" : ""}${idea.trend}%</b></div>
              </div>
              <div class="row-actions">
                <button class="primary-button" data-open="${idea.id}">상세 보기</button>
                <button class="secondary-button" data-like="${idea.id}">좋아요 ${money.format(idea.likes)}</button>
              </div>
            </article>
          `)
          .join("") || `<div class="empty">검색 조건에 맞는 아이디어가 없습니다.</div>`}
      </section>
      <aside class="section-stack">
        <section class="panel spotlight-card">
          <div class="panel-title">
            <h2>오늘의 상승 아이디어</h2>
            <span class="badge blue">HOT</span>
          </div>
          <b>${topIdea.title}</b>
          <p class="idea-summary">${topIdea.summary}</p>
          <div class="mini-metrics">
            <span>+${topIdea.trend}%</span>
            <span>${topIdea.companyInterests.length}개 기업</span>
            <span>${money.format(topIdea.seedInvested)}P</span>
          </div>
          <button class="primary-button" data-open="${topIdea.id}">바로 보기</button>
        </section>
        <section class="panel">
          <div class="panel-title">
            <h2>실시간 기여자</h2>
            <span class="badge teal">Open Source</span>
          </div>
          <ul class="list">${contributorRows || "<li><b>아직 채택된 기여가 없습니다.</b><small>좋은 피드백을 남겨 첫 기여자가 되어보세요.</small></li>"}</ul>
        </section>
        <section class="panel">
          <div class="panel-title">
            <h2>랭킹 산정 요약</h2>
          </div>
          <ul class="list">
            <li><b>35% 가상 투자</b><small>투자 금액과 투자자 수를 함께 반영</small></li>
            <li><b>25% 기업 관심</b><small>인증 기업의 관심 표시만 반영</small></li>
            <li><b>15% 사용자 반응</b><small>좋아요와 조회수는 낮은 가중치</small></li>
            <li><b>15% 기여 피드백</b><small>채택된 댓글은 강한 검증 신호</small></li>
            <li><b>10% 최근 상승률</b><small>짧은 시간의 반응 속도 반영</small></li>
          </ul>
        </section>
      </aside>
    </div>
  `;
}

function renderDetail() {
  const idea = selectedIdeaId ? getDerivedIdea(selectedIdeaId) : derivedIdeas()[0];
  selectedIdeaId = idea.id;
  const companyOptions = companies.map((name) => `<option value="${name}">${name}</option>`).join("");
  return `
    <button class="ghost-button" data-view="ranking">← 랭킹으로</button>
    <article class="detail-hero">
      <div>
        <span class="eyebrow">${idea.category} · ${idea.visibility}</span>
        <h1>${idea.title}</h1>
        <p>${idea.summary}</p>
        <div class="toolbar">
          <span class="badge gold">${idea.maturity}</span>
          <span class="badge teal">원작자 ${idea.author}</span>
          <span class="badge blue">기여자 ${idea.acceptedCount}명</span>
        </div>
      </div>
      <div class="stat-stack">
        <div class="stat-line"><span>가상 투자금</span><b>${money.format(idea.seedInvested)} P</b></div>
        <div class="stat-line"><span>현재 Seed 가격</span><b>${idea.price} P</b></div>
        <div class="stat-line"><span>기업 관심</span><b>${idea.companyInterests.length}개</b></div>
        <div class="stat-line"><span>좋아요 / 댓글</span><b>${money.format(idea.likes)} / ${idea.feedback.length}</b></div>
        <div class="stat-line"><span>랭킹 상승률</span><b class="${idea.trend >= 0 ? "trend-up" : "trend-down"}">${idea.trend >= 0 ? "+" : ""}${idea.trend}%</b></div>
      </div>
    </article>

    <div class="detail-body">
      <div class="section-stack">
        <section class="panel">
          <div class="panel-title"><h2>사업 아이디어 기획서</h2></div>
          <div class="plan-grid">
            <div class="plan-item"><b>문제 정의</b><p>${idea.problem}</p></div>
            <div class="plan-item"><b>목표 고객</b><p>${idea.target}</p></div>
            <div class="plan-item"><b>해결 방식</b><p>${idea.solution}</p></div>
            <div class="plan-item"><b>수익 모델</b><p>${idea.businessModel}</p></div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-title">
            <h2>구조화 피드백</h2>
            <button class="secondary-button" data-like="${idea.id}">좋아요 +5P</button>
          </div>
          <form class="form" data-feedback-form="${idea.id}">
            <label class="field"><span>피드백 유형</span><select name="type"><option>고객군</option><option>수익모델</option><option>경쟁분석</option><option>실행난이도</option><option>시장성</option></select></label>
            <label class="field"><span>의견</span><textarea name="text" placeholder="사업화 검증에 도움이 되는 의견을 남겨주세요. 한 게시글당 댓글 보상은 1회만 지급됩니다."></textarea></label>
            <button class="primary-button" type="submit">피드백 등록</button>
          </form>
          <div class="candidate-list">
            ${idea.feedback
              .map((item) => `
                <article class="feedback-item">
                  <div class="feedback-head">
                    <div><b>${item.author}</b> <span class="badge blue">${item.type}</span> ${item.accepted ? `<span class="badge gold">채택됨</span>` : ""}</div>
                    ${item.accepted ? "" : `<button class="secondary-button" data-accept="${idea.id}:${item.id}">기여 채택</button>`}
                  </div>
                  <p>${item.text}</p>
                </article>
              `)
              .join("")}
          </div>
        </section>
      </div>

      <aside class="section-stack">
        <section class="panel">
          <div class="panel-title"><h2>Seed Point 투자</h2></div>
          <form class="form" data-invest-form="${idea.id}">
            <label class="field"><span>투자 포인트</span><input type="number" name="amount" min="50" step="50" placeholder="최소 50P" /></label>
            <button class="primary-button" type="submit">가상 투자하기</button>
          </form>
          <p class="idea-summary">투자한 아이디어의 Seed 가격이 오르면 지갑의 평가액도 함께 오릅니다. 실제 현금 거래가 아닌 참여형 검증 지표입니다.</p>
        </section>

        <section class="panel">
          <div class="panel-title"><h2>기업 관심 표시</h2></div>
          <form class="form" data-company-form="${idea.id}">
            <label class="field"><span>인증 기업 선택</span><select name="company">${companyOptions}</select></label>
            <button class="secondary-button" type="submit">기업 관심 등록</button>
          </form>
          <ul class="list">
            ${idea.companyInterests.map((name) => `<li><b>${name}</b><small>인증 기업 관심 신호</small></li>`).join("") || `<li><b>아직 기업 관심이 없습니다.</b><small>기업 관심은 랭킹의 강한 신호입니다.</small></li>`}
          </ul>
        </section>

        <section class="panel">
          <div class="panel-title"><h2>아이디어 성장 기록</h2></div>
          <div class="timeline">
            ${idea.timeline.map(([date, text]) => `<div class="timeline-item"><b>${date}</b><span>${text}</span></div>`).join("")}
          </div>
        </section>
      </aside>
    </div>
  `;
}

function mockCandidates(keyword, background) {
  const base = keyword || "초기 사업 아이디어";
  const pain = background || "사용자의 실제 문제";
  return [
    { title: `${base} 실시간 검증 커뮤니티`, summary: `${pain}를 공개 피드백과 가상 투자로 빠르게 검증합니다.`, maturity: "Seed Idea" },
    { title: `${base} B2B 스폰서 매칭`, summary: "기업이 관심 있는 초기 아이디어를 후원하고 광고 포스트를 붙일 수 있습니다.", maturity: "Prototype Ready" },
    { title: `${base} 데이터 리포트 SaaS`, summary: "커뮤니티 반응 데이터를 아이디어 시장성 리포트로 정리합니다.", maturity: "Validated Problem" },
    { title: `${base} 팀빌딩 챌린지`, summary: "기여자를 모아 2주 단위 실험 팀을 만들고 결과를 랭킹에 반영합니다.", maturity: "Seed Idea" },
    { title: `${base} 지역/도메인 특화 MVP`, summary: "작은 고객군에서 먼저 검증한 뒤 기업 제휴로 확장합니다.", maturity: "Business Ready" },
  ];
}

function renderCreate() {
  const candidates = state.draftCandidates || [];
  const selected = candidates[selectedCandidate];
  return `
    <div class="view-header">
      <div>
        <span class="eyebrow">AI Idea Builder</span>
        <h1>툭 던진 문제의식을 사업 아이디어로 만들기</h1>
        <p>키워드와 경험한 pain point를 입력하면 AI가 5가지 후보를 제안합니다. 채택한 후보는 바로 랭킹에 올라갑니다.</p>
      </div>
    </div>
    <div class="grid-2">
      <section class="panel">
        <div class="panel-title"><h2>1. 문제의식 입력</h2></div>
        <form class="form" id="candidateForm">
          <label class="field"><span>사업화 키워드</span><input name="keyword" placeholder="예: 소상공인 재고, AI 식단, 사이드 프로젝트" /></label>
          <label class="field"><span>왜 이 아이디어를 생각했나요?</span><textarea name="background" placeholder="실생활 pain point, 직무 도메인에서 느낀 문제, 시장에 필요하다고 느낀 계기"></textarea></label>
          <button class="primary-button" type="submit">AI 후보 5개 생성</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-title"><h2>2. 후보 선택</h2></div>
        <div class="candidate-list">
          ${candidates.length
            ? candidates.map((item, index) => `<button class="candidate ${selectedCandidate === index ? "active" : ""}" data-candidate="${index}"><b>${index + 1}. ${item.title}</b><span>${item.summary}</span><small>${item.maturity}</small></button>`).join("")
            : `<div class="empty">왼쪽 입력을 바탕으로 AI 후보를 생성해보세요.</div>`}
        </div>
      </section>
    </div>
    <section class="panel" style="margin-top:16px">
      <div class="panel-title"><h2>3. 게시 전 수정</h2></div>
      <form class="form" id="publishForm">
        <div class="grid-3">
          <label class="field"><span>제목</span><input name="title" value="${selected ? selected.title : ""}" /></label>
          <label class="field"><span>카테고리</span><select name="category"><option>AI</option><option>로컬</option><option>커뮤니티</option></select></label>
          <label class="field"><span>공개 범위</span><select name="visibility"><option>공개형</option><option>반공개형</option><option>비공개 검증형</option><option>매칭형 공개</option></select></label>
        </div>
        <label class="field"><span>요약</span><textarea name="summary">${selected ? selected.summary : ""}</textarea></label>
        <div class="grid-3">
          <label class="field"><span>문제 정의</span><textarea name="problem">사용자가 반복적으로 겪는 문제를 명확히 정의합니다.</textarea></label>
          <label class="field"><span>목표 고객</span><textarea name="target">가장 먼저 반응할 좁은 고객군을 설정합니다.</textarea></label>
          <label class="field"><span>수익 모델</span><textarea name="businessModel">구독, 제휴, 광고, 수수료 중 초기 검증 가능한 모델을 선택합니다.</textarea></label>
        </div>
        <button class="primary-button" type="submit">아이디어 게시하고 랭킹에 올리기</button>
      </form>
    </section>
  `;
}

function renderPortfolio() {
  const rows = state.investments.map((item) => {
    const idea = getDerivedIdea(item.ideaId);
    if (!idea) return "";
    const value = item.quantity * idea.price;
    const pnl = value - item.points;
    return `
      <div class="portfolio-row">
        <div><b>${idea.title}</b><span>${item.createdAt} 투자</span></div>
        <div><span>투자 원금</span><b>${money.format(item.points)} P</b></div>
        <div><span>현재가</span><b>${idea.price} P</b></div>
        <div><span>평가액</span><b>${money.format(Math.round(value))} P</b></div>
        <div><span>손익</span><b class="${pnl >= 0 ? "trend-up" : "trend-down"}">${pnl >= 0 ? "+" : ""}${money.format(Math.round(pnl))} P</b></div>
        <button class="secondary-button" data-withdraw="${item.ideaId}">회수</button>
      </div>
    `;
  }).join("");
  return `
    <div class="view-header">
      <div>
        <span class="eyebrow">Seed Point Wallet</span>
        <h1>포인트 지갑과 투자 현황</h1>
        <p>Seed Point는 참여 보상과 가상 투자에만 쓰이는 단일 포인트입니다. 실제 현금이나 증권이 아닙니다.</p>
      </div>
    </div>
    <div class="grid-3">
      <section class="panel"><span class="eyebrow">Balance</span><h2>${money.format(Math.round(state.user.points))} P</h2><p class="idea-summary">사용 가능한 Seed Point</p></section>
      <section class="panel"><span class="eyebrow">Portfolio</span><h2>${money.format(portfolioValue())} P</h2><p class="idea-summary">현재 Seed 가격 기준 평가액</p></section>
      <section class="panel"><span class="eyebrow">Rule</span><h2>1일 한도형</h2><p class="idea-summary">MVP에서는 투자 한도와 로그인 제한으로 조작을 줄입니다.</p></section>
    </div>
    <section class="panel" style="margin-top:16px">
      <div class="panel-title"><h2>투자 목록</h2></div>
      ${rows || `<div class="empty">아직 투자한 아이디어가 없습니다.</div>`}
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-title"><h2>포인트 내역</h2></div>
      <ul class="list">
        ${state.pointHistory.slice(0, 10).map((item) => `<li><b class="${item.amount >= 0 ? "trend-up" : "trend-down"}">${item.amount >= 0 ? "+" : ""}${money.format(item.amount)} P</b><small>${item.text} · ${item.at}</small></li>`).join("")}
      </ul>
    </section>
  `;
}

function renderContributors() {
  const feedback = state.ideas.flatMap((idea) => idea.feedback.map((item) => ({ ...item, ideaTitle: idea.title })));
  return `
    <div class="view-header">
      <div>
        <span class="eyebrow">Contribution Board</span>
        <h1>오픈소스형 기여 기록</h1>
        <p>원작자와 기여자를 함께 기록해 아이디어가 발전한 과정을 포트폴리오 자산으로 남깁니다.</p>
      </div>
    </div>
    <section class="panel">
      <div class="candidate-list">
        ${feedback.map((item) => `
          <article class="feedback-item">
            <div class="feedback-head">
              <div><b>${item.author}</b> <span class="badge blue">${item.type}</span> ${item.accepted ? `<span class="badge gold">기여자 배지</span>` : `<span class="badge gray">검토 중</span>`}</div>
              <small>${item.ideaTitle}</small>
            </div>
            <p>${item.text}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderCompany() {
  return `
    <div class="view-header">
      <div>
        <span class="eyebrow">Company Signals</span>
        <h1>기업 관심과 스폰서 구조</h1>
        <p>인증 기업의 관심은 시장성 신호로 랭킹에 반영됩니다. 스폰서 광고는 게시글 하단 노출 상품이며 랭킹 점수에는 포함하지 않습니다.</p>
      </div>
    </div>
    <section class="ranking-list">
      ${derivedIdeas().map((idea) => `
        <article class="rank-row">
          <div class="rank-no">${idea.companyInterests.length}</div>
          <div>
            <div class="idea-title"><h2>${idea.title}</h2><span class="badge blue">${idea.category}</span></div>
            <p class="idea-summary">${idea.companyInterests.join(", ") || "관심 기업 없음"}</p>
          </div>
          <div class="metric-grid">
            <div class="metric"><span>기업 관심</span><b>${idea.companyInterests.length}</b></div>
            <div class="metric"><span>랭킹 점수</span><b>${Math.round(idea.score)}</b></div>
            <div class="metric"><span>조회수</span><b>${money.format(idea.views)}</b></div>
            <div class="metric"><span>피드백</span><b>${idea.feedback.length}</b></div>
            <div class="metric"><span>스폰서</span><b>별도</b></div>
          </div>
          <button class="primary-button" data-open="${idea.id}">상세</button>
        </article>
      `).join("")}
    </section>
  `;
}

function render() {
  updateWallet();
  const root = document.getElementById("viewRoot");
  if (currentView === "create") root.innerHTML = renderCreate();
  else if (currentView === "detail") root.innerHTML = renderDetail();
  else if (currentView === "portfolio") root.innerHTML = renderPortfolio();
  else if (currentView === "contributors") root.innerHTML = renderContributors();
  else if (currentView === "company") root.innerHTML = renderCompany();
  else root.innerHTML = renderRanking();
  saveState();
}

function likeIdea(id) {
  if (state.user.likedIdeaIds.includes(id)) {
    showToast("이미 좋아요를 누른 아이디어입니다.");
    return;
  }
  const idea = getIdea(id);
  idea.likes += 1;
  state.user.likedIdeaIds.push(id);
  state.user.points += 5;
  pointLog("reward", 5, `"${idea.title}" 좋아요 보상`);
  showToast("좋아요가 반영되고 5P를 받았습니다.");
  render();
}

function openIdea(id) {
  const idea = getIdea(id);
  if (!state.user.viewedIdeaIds.includes(id)) {
    idea.views += 1;
    state.user.viewedIdeaIds.push(id);
    state.user.points += 1;
    pointLog("reward", 1, `"${idea.title}" 조회 보상`);
  }
  setView("detail", id);
}

function investIdea(id, amount) {
  const idea = getIdea(id);
  const derived = getDerivedIdea(id);
  if (!amount || amount < 50) return showToast("최소 50P부터 투자할 수 있습니다.");
  if (amount > state.user.points) return showToast("보유 Seed Point가 부족합니다.");
  if (amount > 1200) return showToast("MVP 조작 방지를 위해 1회 투자 한도는 1,200P입니다.");
  const existing = state.investments.find((item) => item.ideaId === id);
  state.user.points -= amount;
  idea.seedInvested += amount;
  if (!existing) idea.investors += 1;
  const quantity = amount / derived.price;
  if (existing) {
    existing.points += amount;
    existing.quantity += quantity;
    existing.entryPrice = Math.round(existing.points / existing.quantity);
  } else {
    state.investments.push({ ideaId: id, points: amount, entryPrice: derived.price, quantity, createdAt: nowText() });
  }
  idea.trend = Number((idea.trend + Math.min(4.5, amount / 350)).toFixed(1));
  pointLog("invest", -amount, `"${idea.title}"에 가상 투자`);
  showToast("투자가 반영되어 랭킹 점수가 갱신되었습니다.");
  render();
}

function withdrawInvestment(id) {
  const index = state.investments.findIndex((item) => item.ideaId === id);
  if (index < 0) return;
  const item = state.investments[index];
  const idea = getDerivedIdea(id);
  const value = Math.round(item.quantity * idea.price);
  state.user.points += value;
  state.investments.splice(index, 1);
  pointLog("withdraw", value, `"${idea.title}" 투자 회수`);
  showToast(`${money.format(value)}P가 지갑으로 돌아왔습니다.`);
  render();
}

function acceptFeedback(payload) {
  const [ideaId, feedbackId] = payload.split(":");
  const idea = getIdea(ideaId);
  const feedback = idea.feedback.find((item) => item.id === feedbackId);
  feedback.accepted = true;
  idea.trend = Number((idea.trend + 1.8).toFixed(1));
  if (feedback.author === state.user.name) {
    state.user.points += 300;
    pointLog("reward", 300, `"${idea.title}" 피드백 채택 보상`);
  }
  idea.timeline.push([nowText(), `${feedback.author}님의 ${feedback.type} 피드백 채택`]);
  showToast("피드백이 기여자로 채택되었습니다.");
  render();
}

function companyInterest(id, company) {
  const idea = getIdea(id);
  if (idea.companyInterests.includes(company)) return showToast("이미 관심을 표시한 기업입니다.");
  idea.companyInterests.push(company);
  idea.trend = Number((idea.trend + 3.2).toFixed(1));
  let bonus = 0;
  if (state.user.likedIdeaIds.includes(id)) bonus += 80;
  if (idea.feedback.some((item) => item.author === state.user.name)) bonus += 150;
  if (bonus) {
    state.user.points += bonus;
    pointLog("reward", bonus, `"${idea.title}" 기업 관심 연동 보상`);
  }
  idea.timeline.push([nowText(), `${company} 기업 관심 표시`]);
  showToast(bonus ? `기업 관심이 등록되고 ${bonus}P 보너스를 받았습니다.` : "기업 관심이 등록되었습니다.");
  render();
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  const openButton = event.target.closest("[data-open]");
  const likeButton = event.target.closest("[data-like]");
  const categoryButton = event.target.closest("[data-category]");
  const candidateButton = event.target.closest("[data-candidate]");
  const acceptButton = event.target.closest("[data-accept]");
  const withdrawButton = event.target.closest("[data-withdraw]");

  if (viewButton) setView(viewButton.dataset.view);
  if (openButton) openIdea(openButton.dataset.open);
  if (likeButton) likeIdea(likeButton.dataset.like);
  if (categoryButton) {
    activeCategory = categoryButton.dataset.category;
    render();
  }
  if (candidateButton) {
    selectedCandidate = Number(candidateButton.dataset.candidate);
    render();
  }
  if (acceptButton) acceptFeedback(acceptButton.dataset.accept);
  if (withdrawButton) withdrawInvestment(withdrawButton.dataset.withdraw);
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;

  if (form.id === "candidateForm") {
    const data = new FormData(form);
    state.draftCandidates = mockCandidates(data.get("keyword").trim(), data.get("background").trim());
    selectedCandidate = 0;
    showToast("AI 후보 5개를 생성했습니다.");
    render();
  }

  if (form.id === "publishForm") {
    const data = new FormData(form);
    const title = data.get("title").trim();
    if (!title) return showToast("게시할 아이디어 제목을 입력해주세요.");
    const idea = {
      id: `idea-${Date.now()}`,
      title,
      category: data.get("category"),
      visibility: data.get("visibility"),
      maturity: "Seed Idea",
      author: state.user.name,
      summary: data.get("summary").trim() || "AI가 생성한 사업화 아이디어 초안입니다.",
      problem: data.get("problem").trim(),
      target: data.get("target").trim(),
      solution: "AI 초안을 바탕으로 MVP 핵심 기능과 검증 흐름을 정의합니다.",
      businessModel: data.get("businessModel").trim(),
      seedInvested: 0,
      investors: 0,
      companyInterests: [],
      likes: 0,
      views: 1,
      trend: 0,
      timeline: [[nowText(), "AI 등록 플로우로 최초 게시"]],
      feedback: [],
    };
    state.ideas.unshift(idea);
    state.user.points += 50;
    pointLog("reward", 50, "아이디어 최초 게시 보상");
    state.draftCandidates = [];
    showToast("아이디어가 게시되고 50P를 받았습니다.");
    setView("detail", idea.id);
  }

  const feedbackId = form.dataset.feedbackForm;
  if (feedbackId) {
    const data = new FormData(form);
    const text = data.get("text").trim();
    if (text.length < 5) return showToast("피드백을 조금 더 구체적으로 작성해주세요.");
    const idea = getIdea(feedbackId);
    idea.feedback.unshift({ id: `fb-${Date.now()}`, author: state.user.name, type: data.get("type"), text, accepted: false });
    if (!state.user.feedbackRewardedIdeaIds.includes(feedbackId)) {
      state.user.feedbackRewardedIdeaIds.push(feedbackId);
      state.user.points += 20;
      pointLog("reward", 20, `"${idea.title}" 댓글 작성 보상`);
    }
    showToast("피드백이 등록되었습니다.");
    render();
  }

  const investId = form.dataset.investForm;
  if (investId) investIdea(investId, Number(new FormData(form).get("amount")));

  const companyId = form.dataset.companyForm;
  if (companyId) companyInterest(companyId, new FormData(form).get("company"));
});

document.getElementById("searchInput").addEventListener("input", render);
document.getElementById("resetButton").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  state = makeDefaultState();
  selectedIdeaId = null;
  activeCategory = "전체";
  currentView = "ranking";
  showToast("Mock 데이터가 초기화되었습니다.");
  render();
});

render();
