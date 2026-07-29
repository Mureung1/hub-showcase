import { MOCK_RANKINGS } from '../mockData';

interface LeaderboardProps {
  activeTab?: 'upcoming' | 'released' | 'ranking';
  rankingPeriod: 'current' | 'last';
  setRankingPeriod: (period: 'current' | 'last') => void;
  showToast: (msg: string) => void;
}

export default function Leaderboard({
  activeTab = 'ranking',
  rankingPeriod,
  setRankingPeriod,
  showToast,
}: LeaderboardProps) {
  if (activeTab !== 'ranking') return null;


  return (
    <section className="ranking-section" id="ranking-dashboard">
      <div className="ranking-header">
        <h2 className="section-title">weekly leaderboard</h2>
        <div className="ranking-controls">
          <button
            className={`btn-rank-toggle ${rankingPeriod === 'current' ? 'active' : ''}`}
            onClick={() => {
              setRankingPeriod('current');
              showToast('this week 주간 랭킹 정보로 전환되었습니다.');
            }}
          >
            this week
          </button>
          <button
            className={`btn-rank-toggle ${rankingPeriod === 'last' ? 'active' : ''}`}
            onClick={() => {
              setRankingPeriod('last');
              showToast('last week 주간 랭킹 정보로 전환되었습니다.');
            }}
          >
            last week
          </button>
        </div>
      </div>

      <div className="ranking-content">
        {/* Left Podium (1st, 2nd, 3rd) */}
        <div className="podium-container">
          {/* Rank 1 Card */}
          <div className="podium-card rank-1">
            <div className="podium-top-badge">
              <span className="card-tag">gold standard</span>
              <span className="status-badge upcoming">rank #01</span>
            </div>

            <div className="user-profile">
              <div className="user-avatar">{MOCK_RANKINGS[rankingPeriod].podium[0].avatar}</div>
              <div className="user-info">
                <span className="username">{MOCK_RANKINGS[rankingPeriod].podium[0].name}</span>
                <span className="user-reward-label">weekly prize</span>
                <span className="user-reward accent-text">
                  {MOCK_RANKINGS[rankingPeriod].podium[0].reward}
                </span>
              </div>
            </div>

            <div className="podium-stats">
              <div className="stat-box">
                <span className="stat-label">accuracy</span>
                <span className="stat-val accent-text">
                  {MOCK_RANKINGS[rankingPeriod].podium[0].accuracy}
                </span>
              </div>
              <div className="stat-box">
                <span className="stat-label">accumulated points</span>
                <span className="stat-val">
                  {MOCK_RANKINGS[rankingPeriod].podium[0].points}
                </span>
              </div>
            </div>
          </div>

          {/* Rank 2 & 3 Subgrid */}
          <div className="podium-sub-row">
            {/* Rank 2 */}
            <div className="podium-card rank-2">
              <div className="podium-top-badge">
                <span className="card-tag">contender</span>
                <span className="status-badge released">rank #02</span>
              </div>

              <div className="user-profile small">
                <div className="user-avatar">{MOCK_RANKINGS[rankingPeriod].podium[1].avatar}</div>
                <div className="user-info">
                  <span className="username">{MOCK_RANKINGS[rankingPeriod].podium[1].name}</span>
                  <span className="user-reward">
                    {MOCK_RANKINGS[rankingPeriod].podium[1].reward}
                  </span>
                </div>
              </div>

              <div className="podium-stats">
                <div className="stat-box">
                  <span className="stat-label">accuracy</span>
                  <span className="stat-val accent-text">
                    {MOCK_RANKINGS[rankingPeriod].podium[1].accuracy}
                  </span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">points</span>
                  <span className="stat-val">
                    {MOCK_RANKINGS[rankingPeriod].podium[1].points}
                  </span>
                </div>
              </div>
            </div>

            {/* Rank 3 */}
            <div className="podium-card rank-3">
              <div className="podium-top-badge">
                <span className="card-tag">contender</span>
                <span className="status-badge released">rank #03</span>
              </div>

              <div className="user-profile small">
                <div className="user-avatar">{MOCK_RANKINGS[rankingPeriod].podium[2].avatar}</div>
                <div className="user-info">
                  <span className="username">{MOCK_RANKINGS[rankingPeriod].podium[2].name}</span>
                  <span className="user-reward">
                    {MOCK_RANKINGS[rankingPeriod].podium[2].reward}
                  </span>
                </div>
              </div>

              <div className="podium-stats">
                <div className="stat-box">
                  <span className="stat-label">accuracy</span>
                  <span className="stat-val accent-text">
                    {MOCK_RANKINGS[rankingPeriod].podium[2].accuracy}
                  </span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">points</span>
                  <span className="stat-val">
                    {MOCK_RANKINGS[rankingPeriod].podium[2].points}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Contenders List */}
        <div className="rank-list-container">
          <h3 className="list-title">top contenders (rank 04 - 10)</h3>

          <div className="rank-list">
            {MOCK_RANKINGS[rankingPeriod].list.map((item) => {
              let trendIndicator = '•';
              let trendClass = 'trend-same';
              if (item.trend === 'up') {
                trendIndicator = '▲';
                trendClass = 'trend-up';
              } else if (item.trend === 'down') {
                trendIndicator = '▼';
                trendClass = 'trend-down';
              }

              return (
                <div key={item.rank} className="rank-list-row">
                  <span className="row-rank">{item.rank}</span>
                  <span className="row-name">{item.name}</span>
                  <span className="row-acc accent-text">{item.accuracy}</span>
                  <span className="row-points">{item.points}</span>
                  <span className={`row-trend ${trendClass}`}>{trendIndicator}</span>
                </div>
              );
            })}
          </div>

          {/* Standing Info Widget */}
          <div className="my-rank-card">
            <div className="my-rank-header-box">
              <span className="my-rank-label">your standing</span>
              <span className="my-rank-val">rank #14 // @youngmin</span>
            </div>

            <div className="my-rank-stats-grid">
              <div className="my-stat">
                <span className="label">my accuracy</span>
                <span className="val accent-text">91.8%</span>
              </div>
              <div className="my-stat">
                <span className="label">total points</span>
                <span className="val">8,450 pts</span>
              </div>
            </div>

            <div className="my-rank-footer">
              <span>
                you need <strong className="accent-text">+450 pts</strong> to enter top 10
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
