import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LineChart, Award, BookOpen, GraduationCap, CheckCircle, HelpCircle, TrendingUp } from 'lucide-react';

// Mock Grade Data per student profile
const STUDENT_GRADES_DATABASE = {
  'transfer': {
    name: '김경상',
    summary: {
      totalCredits: 84,
      totalGoal: 130,
      majorCredits: 42,
      majorGoal: 60,
      generalCredits: 42,
      generalGoal: 70,
      gpa: '3.90',
    },
    trend: [
      { semester: '1-1 (전적대)', gpa: 3.40, credits: 18, majorGpa: 3.20 },
      { semester: '1-2 (전적대)', gpa: 3.55, credits: 18, majorGpa: 3.40 },
      { semester: '2-1 (전적대)', gpa: 3.65, credits: 18, majorGpa: 3.50 },
      { semester: '2-2 (전적대)', gpa: 3.72, credits: 18, majorGpa: 3.60 },
      { semester: '3-1 (GNU)', gpa: 3.90, credits: 12, majorGpa: 4.00 }
    ],
    semesters: [
      { id: '1-1', title: '1학년 1학기 (전적대 인정)', gpa: '3.40', majorGpa: '3.20', earned: 18, majorEarned: 6, remark: '편입학 학점인정' },
      { id: '1-2', title: '1학년 2학기 (전적대 인정)', gpa: '3.55', majorGpa: '3.40', earned: 18, majorEarned: 9, remark: '편입학 학점인정' },
      { id: '2-1', title: '2학년 1학기 (전적대 인정)', gpa: '3.65', majorGpa: '3.50', earned: 18, majorEarned: 12, remark: '편입학 학점인정' },
      { id: '2-2', title: '2학년 2학기 (전적대 인정)', gpa: '3.72', majorGpa: '3.60', earned: 18, majorEarned: 9, remark: '편입학 학점인정' },
      { id: '3-1', title: '3학년 1학기 (GNU)', gpa: '3.90', majorGpa: '4.00', earned: 12, majorEarned: 6, remark: '성적 우수 백학장학' }
    ]
  },
  'general': {
    name: '박경상',
    summary: {
      totalCredits: 96,
      totalGoal: 130,
      majorCredits: 42,
      majorGoal: 60,
      generalCredits: 54,
      generalGoal: 70,
      gpa: '3.75',
    },
    trend: [
      { semester: '1-1', gpa: 3.25, credits: 18, majorGpa: 3.00 },
      { semester: '1-2', gpa: 3.42, credits: 19, majorGpa: 3.30 },
      { semester: '2-1', gpa: 3.65, credits: 21, majorGpa: 3.70 },
      { semester: '2-2', gpa: 3.78, credits: 20, majorGpa: 3.80 },
      { semester: '3-1', gpa: 3.92, credits: 18, majorGpa: 4.10 }
    ],
    semesters: [
      { id: '1-1', title: '1학년 1학기', gpa: '3.25', majorGpa: '3.00', earned: 18, majorEarned: 6, remark: '-' },
      { id: '1-2', title: '1학년 2학기', gpa: '3.42', majorGpa: '3.30', earned: 19, majorEarned: 6, remark: '-' },
      { id: '2-1', title: '2학년 1학기', gpa: '3.65', majorGpa: '3.70', earned: 21, majorEarned: 12, remark: '성적 우수 격려금' },
      { id: '2-2', title: '2학년 2학기', gpa: '3.78', majorGpa: '3.80', earned: 20, majorEarned: 12, remark: '성적 우수 동선장학' },
      { id: '3-1', title: '3학년 1학기', gpa: '3.92', majorGpa: '4.10', earned: 18, majorEarned: 6, remark: '학과 수석 개척장학' }
    ]
  },
  'double-major': {
    name: '이경상',
    summary: {
      totalCredits: 78,
      totalGoal: 150,
      majorCredits: 33,
      majorGoal: 60,
      generalCredits: 45,
      generalGoal: 90,
      gpa: '3.64',
    },
    trend: [
      { semester: '1-1', gpa: 3.50, credits: 17, majorGpa: 3.30 },
      { semester: '1-2', gpa: 3.65, credits: 18, majorGpa: 3.50 },
      { semester: '2-1', gpa: 3.48, credits: 19, majorGpa: 3.20 },
      { semester: '2-2', gpa: 3.72, credits: 18, majorGpa: 3.65 },
      { semester: '3-1', gpa: 3.85, credits: 16, majorGpa: 3.80 }
    ],
    semesters: [
      { id: '1-1', title: '1학년 1학기', gpa: '3.50', majorGpa: '3.30', earned: 17, majorEarned: 6, remark: '-' },
      { id: '1-2', title: '1학년 2학기', gpa: '3.65', majorGpa: '3.50', earned: 18, majorEarned: 6, remark: '-' },
      { id: '2-1', title: '2학년 1학기', gpa: '3.48', majorGpa: '3.20', earned: 19, majorEarned: 9, remark: '복수전공(경영) 승인' },
      { id: '2-2', title: '2학년 2학기', gpa: '3.72', majorGpa: '3.65', earned: 18, majorEarned: 12, remark: '성적 우수 동선장학' },
      { id: '3-1', title: '3학년 1학기', gpa: '3.85', majorGpa: '3.80', earned: 16, majorEarned: 9, remark: '경영학과 학술 우수상' }
    ]
  }
};

function CreditAnalytics({ initialStudentType }) {
  const navigate = useNavigate();
  const [studentType, setStudentType] = useState(initialStudentType || 'transfer');
  
  const studentData = STUDENT_GRADES_DATABASE[studentType];
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // SVG Chart Dimensions
  const chartWidth = 540;
  const chartHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  // X Coordinate calculation
  const getX = (index, total) => {
    const usableWidth = chartWidth - paddingLeft - paddingRight;
    return paddingLeft + (index / (total - 1)) * usableWidth;
  };

  // Y Coordinate calculation (mapping GPA 2.0 ~ 4.5)
  const minGpa = 2.0;
  const maxGpa = 4.5;
  const getY = (gpa) => {
    const usableHeight = chartHeight - paddingTop - paddingBottom;
    const gpaRatio = (gpa - minGpa) / (maxGpa - minGpa);
    // SVG coordinates start at top left (0,0), so subtract from height
    return chartHeight - paddingBottom - gpaRatio * usableHeight;
  };

  // Build SVG Path strings for trend line and area fill
  const buildSvgPaths = (points) => {
    if (!points || points.length === 0) return { linePath: '', areaPath: '' };
    
    let linePath = '';
    let areaPath = '';
    
    points.forEach((pt, idx) => {
      const cx = getX(idx, points.length);
      const cy = getY(pt.gpa);
      
      if (idx === 0) {
        linePath = `M ${cx} ${cy}`;
        areaPath = `M ${cx} ${chartHeight - paddingBottom} L ${cx} ${cy}`;
      } else {
        // Curve construction using helper control points (simplified Bezier)
        const prevCx = getX(idx - 1, points.length);
        const prevCy = getY(points[idx - 1].gpa);
        const cpX1 = prevCx + (cx - prevCx) / 2;
        const cpY1 = prevCy;
        const cpX2 = prevCx + (cx - prevCx) / 2;
        const cpY2 = cy;
        
        linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${cx} ${cy}`;
        areaPath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${cx} ${cy}`;
      }
      
      if (idx === points.length - 1) {
        areaPath += ` L ${cx} ${chartHeight - paddingBottom} Z`;
      }
    });

    return { linePath, areaPath };
  };

  const { linePath, areaPath } = buildSvgPaths(studentData.trend);

  // Grid line GPA markers
  const yTicks = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5];

  // Helper helper to format categories
  const getStudentTypeLabel = (type) => {
    switch (type) {
      case 'transfer': return '편입생';
      case 'general': return '일반재학생';
      case 'double-major': return '다전공자';
      default: return '학생';
    }
  };

  return (
    <div className="credit-analytics">
      {/* Top Navbar */}
      <header className="portal-header card-glass">
        <div className="portal-logo" onClick={() => navigate('/portal')}>
          <ArrowLeft size={18} className="logo-icon text-indigo" />
          <span className="logo-text">GNU AI PORTAL</span>
        </div>
        
        <div className="portal-user-menu">
          <div className="profile-switcher-wrapper">
            <span className="switcher-label">시뮬레이션 학적: </span>
            <select 
              value={studentType} 
              onChange={(e) => setStudentType(e.target.value)}
              className="student-type-select"
            >
              <option value="transfer">편입생 (김경상)</option>
              <option value="general">일반재학생 (박경상)</option>
              <option value="double-major">다전공자 (이경상)</option>
            </select>
          </div>
          
          <button onClick={() => navigate('/portal')} className="btn-logout">
            <span>메인 포털</span>
          </button>
        </div>
      </header>

      {/* Main Analytics Content Container */}
      <main className="analytics-layout">
        {/* Page title */}
        <section className="analytics-header animate-fade-in-up">
          <h2>학점 분석 & 성적 추이 리포트</h2>
          <p>
            {studentData.name}님의 학기별 이수 학점 세부 내역 및 평점 추이를 시각화하여 보여줍니다.
          </p>
        </section>

        {/* Summary Metric Cards Row */}
        <section className="summary-grid animate-fade-in-up">
          <div className="summary-card card-glass">
            <div className="card-top">
              <span>전체 이수 학점</span>
              <BookOpen className="card-icon text-indigo" size={18} />
            </div>
            <div className="card-bottom">
              <h3>{studentData.summary.totalCredits} <span className="goal">/ {studentData.summary.totalGoal}학점</span></h3>
              <div className="mini-progress-bar">
                <div className="mini-fill primary" style={{ width: `${(studentData.summary.totalCredits / studentData.summary.totalGoal) * 100}%` }}></div>
              </div>
            </div>
          </div>

          <div className="summary-card card-glass">
            <div className="card-top">
              <span>전공 이수 학점</span>
              <GraduationCap className="card-icon text-blue" size={18} />
            </div>
            <div className="card-bottom">
              <h3>{studentData.summary.majorCredits} <span className="goal">/ {studentData.summary.majorGoal}학점</span></h3>
              <div className="mini-progress-bar">
                <div className="mini-fill secondary" style={{ width: `${(studentData.summary.majorCredits / studentData.summary.majorGoal) * 100}%` }}></div>
              </div>
            </div>
          </div>

          <div className="summary-card card-glass">
            <div className="card-top">
              <span>교양 이수 학점</span>
              <Award className="card-icon text-success" size={18} />
            </div>
            <div className="card-bottom">
              <h3>{studentData.summary.generalCredits} <span className="goal">/ {studentData.summary.generalGoal}학점</span></h3>
              <div className="mini-progress-bar">
                <div className="mini-fill success" style={{ width: `${(studentData.summary.generalCredits / studentData.summary.generalGoal) * 100}%` }}></div>
              </div>
            </div>
          </div>

          <div className="summary-card card-glass">
            <div className="card-top">
              <span>누적 전체 평점 (GPA)</span>
              <TrendingUp className="card-icon text-warning" size={18} />
            </div>
            <div className="card-bottom font-outfit">
              <h3>{studentData.summary.gpa} <span className="goal">/ 4.50</span></h3>
              <span className="trend-up-label">상승 곡선 유지 중</span>
            </div>
          </div>
        </section>

        {/* Charts and Audits Column Section */}
        <section className="charts-section-grid">
          {/* Chart Card */}
          <div className="chart-card card-glass animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="chart-card-header">
              <h4>학기별 성적 추이 (GPA)</h4>
              <div className="chart-legend">
                <span className="legend-item"><span className="dot primary"></span>학기별 GPA</span>
              </div>
            </div>
            
            <div className="chart-body">
              {/* Interactive SVG Chart */}
              <div className="chart-svg-container" style={{ position: 'relative' }}>
                <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--color-primary)" />
                      <stop offset="100%" stopColor="var(--color-secondary)" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {yTicks.map((tick) => {
                    const y = getY(tick);
                    return (
                      <g key={tick}>
                        <line 
                          x1={paddingLeft} 
                          y1={y} 
                          x2={chartWidth - paddingRight} 
                          y2={y} 
                          stroke="rgba(255, 255, 255, 0.05)" 
                          strokeWidth="1"
                        />
                        <text 
                          x={paddingLeft - 8} 
                          y={y + 4} 
                          fill="var(--text-muted)" 
                          fontSize="10" 
                          textAnchor="end"
                          fontFamily="Outfit"
                        >
                          {tick.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Curve Path Shading Fill */}
                  <path d={areaPath} fill="url(#area-grad)" />

                  {/* Curve Stroke Line */}
                  <path d={linePath} fill="none" stroke="url(#line-grad)" strokeWidth="3" />

                  {/* Nodes and Labels */}
                  {studentData.trend.map((pt, idx) => {
                    const cx = getX(idx, studentData.trend.length);
                    const cy = getY(pt.gpa);
                    
                    const isHovered = hoveredPoint?.index === idx;

                    return (
                      <g key={idx}>
                        {/* Interactive Invisible Circle for easier hovering */}
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r="15" 
                          fill="transparent" 
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredPoint({ ...pt, index: idx, cx, cy })}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                        
                        {/* Glow indicator on hover */}
                        {isHovered && (
                          <circle 
                            cx={cx} 
                            cy={cy} 
                            r="12" 
                            fill="var(--color-primary)" 
                            opacity="0.3" 
                            className="animate-pulse"
                          />
                        )}

                        {/* Visible Data Dot */}
                        <circle 
                          cx={cx} 
                          cy={cy} 
                          r={isHovered ? '6' : '4.5'} 
                          fill={isHovered ? '#fff' : 'var(--color-primary)'} 
                          stroke={isHovered ? 'var(--color-secondary)' : '#0B0F19'} 
                          strokeWidth="2" 
                          style={{ transition: 'all 0.2s ease' }}
                        />
                        
                        {/* X-axis semester Label */}
                        <text 
                          x={cx} 
                          y={chartHeight - 12} 
                          fill="var(--text-muted)" 
                          fontSize="9.5" 
                          textAnchor="middle"
                        >
                          {pt.semester}
                        </text>

                        {/* Node value label */}
                        <text 
                          x={cx} 
                          y={cy - 10} 
                          fill="#fff" 
                          fontSize="9" 
                          textAnchor="middle" 
                          fontWeight="bold"
                          fontFamily="Outfit"
                        >
                          {pt.gpa.toFixed(2)}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Interactive Tooltip */}
                {hoveredPoint && (
                  <div 
                    className="chart-tooltip card-glass animate-fade-in"
                    style={{
                      position: 'absolute',
                      left: `${hoveredPoint.cx - 70}px`,
                      top: `${hoveredPoint.cy - 75}px`,
                      pointerEvents: 'none',
                      zIndex: 10,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      background: 'rgba(11, 15, 25, 0.95)',
                      border: '1px solid var(--border-focus)',
                      boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: 'var(--color-secondary)' }}>{hoveredPoint.semester}</div>
                    <div>평점: <span style={{ color: '#fff', fontWeight: 'bold' }}>{hoveredPoint.gpa.toFixed(2)}</span></div>
                    <div>전공평점: <span style={{ color: 'var(--color-accent)' }}>{hoveredPoint.majorGpa.toFixed(2)}</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Credit Audits List */}
          <div className="chart-card card-glass animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <h4>졸업 요건 정밀 감사</h4>
            <div className="audit-list">
              <div className="audit-item">
                <div className="audit-icon-wrapper success">
                  <CheckCircle size={16} />
                </div>
                <div className="audit-text">
                  <h5>기본 교양 영역 이수 상태</h5>
                  <p>기초교양 공통 9학점 이수 기준을 100% 충족하였습니다.</p>
                </div>
              </div>

              <div className="audit-item">
                <div className="audit-icon-wrapper warning">
                  <HelpCircle size={16} />
                </div>
                <div className="audit-text">
                  <h5>전공 심화 학점 이수 현황</h5>
                  <p>
                    총 60학점 중 {studentData.summary.majorCredits}학점을 이수하여, 
                    졸업까지 <strong>{studentData.summary.majorGoal - studentData.summary.majorCredits}학점</strong>의 전공 이수가 추가 필요합니다.
                  </p>
                </div>
              </div>

              <div className="audit-item">
                <div className="audit-icon-wrapper warning">
                  <HelpCircle size={16} />
                </div>
                <div className="audit-text">
                  <h5>균형/융합 선택 영역 감사</h5>
                  <p>
                    {studentType === 'transfer' 
                      ? '융합교양 3영역(기술과 인류)에서 3학점 미이수 상태가 검증되었습니다. 시간표 포털에서 AI 설계를 통해 신청하세요.' 
                      : studentType === 'general'
                      ? '균형교양 4영역(예술과 현대생활)에서 3학점이 누락되어 수강 설계가 요구됩니다.'
                      : '경영전공 필수 마케팅원론(3학점) 미이수로 졸업 요건 경고가 유지되고 있습니다.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Semester-by-semester Grade History Table */}
        <section className="table-card card-glass animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="table-header">
            <h4>학기별 성적 상세 내역</h4>
          </div>
          
          <div className="table-wrapper">
            <table className="grade-table">
              <thead>
                <tr>
                  <th>이수 학기</th>
                  <th>평점 (GPA)</th>
                  <th>전공 평점</th>
                  <th>취득 학점</th>
                  <th>전공 이수 학점</th>
                  <th>비고</th>
                </tr>
              </thead>
              <tbody>
                {studentData.semesters.map((sem) => (
                  <tr key={sem.id}>
                    <td className="sem-title">{sem.title}</td>
                    <td className="gpa-val font-outfit">{sem.gpa}</td>
                    <td className="gpa-val font-outfit text-accent">{sem.majorGpa}</td>
                    <td className="font-outfit">{sem.earned}학점</td>
                    <td className="font-outfit">{sem.majorEarned}학점</td>
                    <td>
                      {sem.remark !== '-' ? (
                        <span className="table-badge-remark">{sem.remark}</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="portal-footer">
        <p>© 2026 경상국립대학교 AI 학업 네비게이터 시스템 (GNU AI Navigator)</p>
      </footer>
    </div>
  );
}

export default CreditAnalytics;
