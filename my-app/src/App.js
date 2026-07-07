import './App.css';

function App() {
  return (
    <div className="container">
      {/* 헤더 */}
      <header>
        <h1>🚨 동네식당 SOS</h1>
        <p>대학생의 <span className="highlight">트렌디한 재능</span>과 소상공인의 <span className="highlight">위기 극복</span>을 연결하는 로컬 상생 플랫폼</p>
      </header>

      {/* 1. 현재 문제점 */}
      <section>
        <h2>1. 문제 정의 (Target Problem)</h2>
        <div className="grid-2">
          <div className="card blue-accent">
            <h3>🏪 소상공인 (동네 사장님)</h3>
            <ul>
              <li><b>내수 침체 & 식재료 폐기:</b> 그날 팔지 못한 재료의 원가 부담</li>
              <li><b>마케팅의 한계 (디지털 소외):</b> 인스타 릴스, 디자인, 리뷰 관리 등 트렌디한 홍보의 어려움</li>
              <li><b>돌발 변수 대응 부족:</b> 우천 취소, 경기 연장 등 갑작스러운 상황에 대처할 방법 부재</li>
            </ul>
          </div>
          <div className="card lemon-accent">
            <h3>🎓 대학생 (로컬 청년)</h3>
            <ul>
              <li><b>높은 외식비 부담:</b> 고물가 시대에 밥값, 커피값 등 생활비 압박</li>
              <li><b>실전 경험(포트폴리오) 부족:</b> 마케팅, 디자인 등 전공/관심사를 실무에 적용해 볼 기회 부재</li>
              <li><b>자투리 시간(공강) 활용:</b> 정규 알바를 하기엔 애매한 시간 활용의 필요성</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 2. 핵심 기능 */}
      <section>
        <h2>2. 서비스 핵심 기능 (Core Features)</h2>
        <div className="grid-2">
          <div className="card">
            <span className="badge badge-blue">Tab 1. 타임어택 세일</span>
            <h3>동네 핫딜 (마감 & 돌발 할인)</h3>
            <p>무거운 API 연동 없이 '태그(Tag)' 기반으로 유저의 호기심을 자극하는 실시간 푸시 서비스</p>
            <ul>
              <li><b>[마감 임박] 🌙</b> 매일 발생하는 재고를 소진하여 앱의 <b>안정적인 DAU(일간 활성 사용자)</b> 확보</li>
              <li><b>[돌발 이벤트] 🚨</b> 우천 취소, 홈팀 승리 등 가끔 발생하는 이벤트로 <b>앱의 재미와 화제성(바이럴)</b> 담당</li>
            </ul>
          </div>
          <div className="card">
            <span className="badge badge-yellow">Tab 2. 로컬 재능 헬퍼</span>
            <h3>동네 찐팬 마케터 (재능 교환)</h3>
            <p>단순 육체노동이 아닌, 대학생의 '디지털 스킬'과 사장님의 '식사권'을 교환하는 헬퍼 게시판</p>
            <ul>
              <li><b>[릴스/숏폼 제작] 🎬</b> 식사권 3장 ↔ 메뉴 홍보 영상 제작</li>
              <li><b>[디자인] 🎨</b> 커피 세트 ↔ 오늘의 마감 할인 포스터 예쁘게 그려주기</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3. 특별함 & 시너지 */}
      <section>
        <h2>3. 우리 서비스만의 특별함 (Uniqueness)</h2>
        <div className="card blue-accent" style={{ borderTopColor: 'var(--lemon-yellow-main)' }}>
          <p><b>✨ 선순환 시너지 구조 (Tab 2 ➔ Tab 1)</b></p>
          <p>기존의 단순 할인 앱이나 알바 매칭 앱과 다릅니다. '동네 찐팬 마케터(Tab 2)'에서 디자인 재능이 있는 대학생이 만들어준 <b>예쁜 홍보 이미지를</b>, 사장님이 '동네 핫딜(Tab 1)'에 <b>마감/돌발 할인을 올릴 때 썸네일로 활용</b>합니다. 두 기능이 톱니바퀴처럼 맞물려 로컬 상권의 자생력을 높입니다.</p>
        </div>
      </section>

      {/* 추가된 섹션: 경쟁사 비교 분석 */}
      <section>
        <h2>💡 타 서비스와의 차별점 (Competitor Analysis)</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-white)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', borderRadius: '12px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--sky-blue-light)', color: 'var(--sky-blue-dark)', textAlign: 'left' }}>
                <th style={{ padding: '15px', borderBottom: '2px solid var(--sky-blue-main)' }}>구분</th>
                <th style={{ padding: '15px', borderBottom: '2px solid var(--sky-blue-main)' }}>동네식당 SOS 🚨</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #CBD5E1' }}>기존 마감할인 앱 (L사)</th>
                <th style={{ padding: '15px', borderBottom: '2px solid #CBD5E1' }}>기존 재능/알바 앱 (K사, A사)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '15px', borderBottom: '1px solid #E2E8F0', fontWeight: 'bold' }}>거래 방식</td>
                <td style={{ padding: '15px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F0FDF4', fontWeight: 'bold', color: '#166534' }}>식사권(현물) 기반 교환</td>
                <td style={{ padding: '15px', borderBottom: '1px solid #E2E8F0' }}>현금 결제</td>
                <td style={{ padding: '15px', borderBottom: '1px solid #E2E8F0' }}>현금 결제 (높은 비용 부담)</td>
              </tr>
              <tr>
                <td style={{ padding: '15px', borderBottom: '1px solid #E2E8F0', fontWeight: 'bold' }}>할인 명분</td>
                <td style={{ padding: '15px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F0FDF4' }}>상황 기반(날씨, 이벤트 등) 감성 타겟</td>
                <td style={{ padding: '15px', borderBottom: '1px solid #E2E8F0' }}>단순 유통기한/재고 소진</td>
                <td style={{ padding: '15px', borderBottom: '1px solid #E2E8F0' }}>-</td>
              </tr>
              <tr>
                <td style={{ padding: '15px', borderBottom: '1px solid #E2E8F0', fontWeight: 'bold' }}>타겟 좁히기</td>
                <td style={{ padding: '15px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F0FDF4' }}>초근접 대학가 / 골목상권 맞춤</td>
                <td style={{ padding: '15px', borderBottom: '1px solid #E2E8F0' }}>전국 단위 (경쟁 치열)</td>
                <td style={{ padding: '15px', borderBottom: '1px solid #E2E8F0' }}>전국 단위</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. 핵심 가치 */}
      <section>
        <h2>4. 핵심 가치 (Core Values)</h2>
        <ul>
          <li><b>Zero Waste (환경):</b> 당일 폐기되는 식자재를 줄여 환경 보호에 기여</li>
          <li><b>Win-Win (경제):</b> 마케팅 비용은 줄이고, 대학생 식비 부담은 낮추는 구조</li>
          <li><b>Digital Transformation (상생):</b> 고령 소상공인의 디지털 진입 장벽 허물기</li>
          <li><b>MVP 최적화 (실현 가능성):</b> 외부 데이터 연동(API) 리소스를 빼고 UI/UX(태그)로 4주 안에 완벽히 구현 가능</li>
        </ul>
      </section>

      {/* 5. 4주 로드맵 */}
      <section>
        <h2>5. 4주 MVP 개발 로드맵</h2>
        <div className="roadmap-item">
          <div className="roadmap-week">Week 1</div>
          <div><b>기획 및 디자인:</b> 세부 기능 명세서 작성, 피그마(Figma)를 활용한 와이어프레임 및 레몬/스카이블루 UI 테마 디자인 완료</div>
        </div>
        <div className="roadmap-item">
          <div className="roadmap-week">Week 2</div>
          <div><b>기본 환경 세팅:</b> 프론트엔드/백엔드 개발 환경 구축, 데이터베이스(DB) 모델링 (유저, 게시글, 태그 스키마 설계)</div>
        </div>
        <div className="roadmap-item">
          <div className="roadmap-week">Week 3</div>
          <div><b>핵심 기능 구현:</b> Tab 1(태그 기반 할인 게시판) 및 Tab 2(재능 교환 텍스트 게시판) CRUD 기능 개발 및 연동</div>
        </div>
        <div className="roadmap-item">
          <div className="roadmap-week">Week 4</div>
          <div><b>QA 및 발표 준비:</b> 버그 수정 및 최종 테스트, 실제 상권 기반의 더미 데이터 입력, 프로젝트 시연 영상 및 피치덱 제작</div>
        </div>
      </section>
    </div>
  );
}

export default App;