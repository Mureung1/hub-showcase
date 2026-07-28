import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell/AppShell';
import { Card, Button, WarningBanner, WeekSchedule } from '../../components';
import text from '../../styles/text.module.css';
import styles from './ResultPage.module.css';
import { useSchedule } from '../../context/ScheduleContext';
import { buildCalendarData, buildDaySummaries, buildSummary } from './formatSchedule';
import { buildChartGeometry, VIEW_HEIGHT, type ChartGeometry } from './buildChart';
import { saveSchedule } from '../../storage/savedSchedules';

export function ResultPage() {
  const { request, response } = useSchedule();
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState<string | null>(null);

  // 계산 없이 주소로 직접 들어왔거나 새로고침한 경우 — 보관함이 비어 있으므로
  // 그리려다 크래시하지 않도록 안내만 띄운다(#18).
  if (response === null) {
    return (
      <AppShell
        title="추천 스케줄"
        step={4}
        backTo="/"
        footer={
          <Button to="/input" variant="primary">
            새 스케줄 만들기
          </Button>
        }
      >
        <h1 className={text.headline}>보여드릴 결과가 없어요</h1>
        <p className={text.subtext}>
          계산 결과는 새로고침하면 사라져요. 정보를 입력하고 다시 계산해주세요.
        </p>
      </AppShell>
    );
  }

  const summary = buildSummary(response, request);
  const daySummaries = buildDaySummaries(response, request);
  const chartGeometry = buildChartGeometry(response, request);
  const calendar = buildCalendarData(response, request);

  // #19 — 이 브라우저에만 저장한다. 저장이 안 되더라도(시크릿 모드·용량 초과) 홈으로는
  // 보내주되, 저장 안 됐다는 사실은 알려준다. 조용히 실패하면 나중에 기록이 없어서 당황한다.
  function handleSave() {
    if (request === null || response === null) return;
    const { ok } = saveSchedule(request, response);
    if (!ok) {
      setSaveError('이 브라우저에 저장하지 못했어요. 저장 공간이 부족하거나 브라우저가 저장을 막고 있을 수 있어요.');
      return;
    }
    navigate('/');
  }

  return (
    <AppShell
      title="추천 스케줄"
      step={4}
      backTo="/input"
      footer={
        <>
          {saveError !== null && <WarningBanner>{saveError}</WarningBanner>}
          <Button to="/adjust" variant="secondary">
            조건 조정하기
          </Button>
          <Button variant="primary" onClick={handleSave}>
            저장하고 마치기
          </Button>
        </>
      }
    >
      <div className={text.eyebrow}>{summary.eyebrow}</div>
      <h1 className={text.displayNum}>{summary.headline}</h1>
      <p className={text.subtext}>{summary.subtext}</p>

      <div className={text.sectionBlock}>
        <div className={styles.chartWrap}>
          <AlertnessChart geometry={chartGeometry} />
          <div className={styles.legend}>
            <span>
              <span className={`${styles.dot} ${styles.sleepDot}`} />
              수면
            </span>
            <span>
              <span className={`${styles.dot} ${styles.studyDot}`} />
              공부
            </span>
            <span>
              <span className={`${styles.dot} ${styles.caffeineDot}`} />
              카페인 섭취
            </span>
          </div>
        </div>
      </div>

      {/* 경고는 있을 때만 — 없는데 빈 배너가 뜨면 안 된다 */}
      {response.warnings.map((warning) => (
        <WarningBanner key={warning}>{warning}</WarningBanner>
      ))}

      {/* #39 — 그래프 아래 주간 스케줄. 시험기간이 보통 1~2주라 월 전체 대신 걸친 주만
          가로 스크롤로 보고, 각 날짜의 취침·기상·카페인 요약을 클릭 없이 그 아래에 상시 표시한다.
          (홈 화면은 여전히 월 캘린더 + 상세 시트를 쓴다 — 결과 화면만 주 단위로 분리) */}
      <div className={text.sectionBlock}>
        <div className={text.sectionHead}>
          <span className={text.label}>주간 스케줄</span>
        </div>
        <Card>
          <WeekSchedule
            rangeStart={calendar.rangeStart}
            rangeEnd={calendar.rangeEnd}
            marks={calendar.marks}
            days={daySummaries}
          />
        </Card>
      </div>
    </AppShell>
  );
}

/**
 * docs/디자인.md 5번 "차트 영역" — alertnessTimeline 응답으로 곡선·마커·라벨을 그린다(#25).
 * 좌표 계산은 buildChart.ts가 하고 여기서는 그리기만 한다.
 */
function AlertnessChart({ geometry }: { geometry: ChartGeometry }) {
  const { width, linePath, areaPath, sleepBands, caffeineMarkers, examMarkers, dayTicks, nowX } =
    geometry;

  if (!linePath) {
    return (
      <svg viewBox={`0 0 ${width} ${VIEW_HEIGHT}`} width={width} height={VIEW_HEIGHT} xmlns="http://www.w3.org/2000/svg">
        <text x={width / 2} y={VIEW_HEIGHT / 2} fontSize="11" textAnchor="middle" fill="#ab9d8c">
          그래프를 그릴 데이터가 없어요
        </text>
      </svg>
    );
  }

  // #26 — 곡선 폭이 기간에 비례해 커지므로 SVG를 실제 폭(px)으로 그리고, 가로로 넘치면
  // 스크롤 컨테이너 안에서 밀어 본다. viewBox와 실제 width를 같은 값으로 맞춰 1:1로 그린다.
  return (
    <div className={styles.chartScroll}>
    <svg viewBox={`0 0 ${width} ${VIEW_HEIGHT}`} width={width} height={VIEW_HEIGHT} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="alertFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9a5b28" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#9a5b28" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 취침~기상 구간 */}
      {sleepBands.map((band) => (
        <rect
          key={`sleep-${band.x}`}
          x={band.x}
          y={18}
          width={band.width}
          height={120}
          fill="var(--tag-sleep)"
          opacity="0.1"
        />
      ))}

      {/* 시험 시각 세로 점선 + 위쪽 라벨. 같은 시각의 시험이 둘 이상이면 x가 겹치므로
          key에 인덱스를 함께 써서 유일하게 만든다(다른 과목이 같은 시각에 시험일 수 있음). */}
      {examMarkers.map((exam, i) => (
        <g key={`exam-${i}-${exam.x}`}>
          <line x1={exam.x} y1={18} x2={exam.x} y2={138} stroke="#d8c9b4" strokeWidth="1" strokeDasharray="3,3" />
          {/* 마지막 시험은 오른쪽 끝에 붙어서 라벨이 잘리므로 안쪽으로 당긴다 */}
          <text
            x={Math.min(width - 22, Math.max(22, exam.x))}
            y={12}
            fontSize="9"
            textAnchor="middle"
            fill="#786a5c"
          >
            {exam.label}
          </text>
        </g>
      ))}

      <path d={areaPath} fill="url(#alertFill)" />
      <path d={linePath} fill="none" stroke="#7a4720" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* 곡선 위 시험 지점 */}
      {examMarkers.map((exam, i) => (
        <circle key={`dot-${i}-${exam.x}`} cx={exam.x} cy={exam.y} r="3.5" fill="#7a4720" stroke="#fff" strokeWidth="1.5" />
      ))}

      {/* 카페인 섭취 지점 */}
      {caffeineMarkers.map((dose) => (
        <circle
          key={`caffeine-${dose.x}`}
          cx={dose.x}
          cy={143}
          r="3"
          fill="var(--tag-caffeine)"
          stroke="#fff"
          strokeWidth="1"
        />
      ))}

      {/* #41 — 지금 시각 세로선. 기간 안일 때만(nowX !== null) 그린다. 위에 "지금" 라벨을
          붙여 시험 점선(회색 점선)과 구분한다. 곡선 위에 올려 현재 위치가 바로 보이게 맨 뒤에 그린다. */}
      {nowX !== null && (
        <g>
          <line x1={nowX} y1={18} x2={nowX} y2={143} stroke="var(--brand-strong)" strokeWidth="1.5" strokeLinecap="round" />
          <rect
            x={Math.min(width - 16, Math.max(16, nowX)) - 15}
            y={2}
            width={30}
            height={13}
            rx={6.5}
            fill="var(--brand-strong)"
          />
          <text
            x={Math.min(width - 16, Math.max(16, nowX))}
            y={11.5}
            fontSize="8.5"
            fontWeight="700"
            textAnchor="middle"
            fill="#fff"
          >
            지금
          </text>
        </g>
      )}

      {/* 날짜가 바뀌는 지점의 요일 */}
      {dayTicks.map((tick) => (
        <text
          key={`tick-${tick.x}`}
          x={Math.min(width - 8, Math.max(8, tick.x))}
          y={158}
          fontSize="9"
          textAnchor="middle"
          fill="#ab9d8c"
        >
          {tick.label}
        </text>
      ))}
    </svg>
    </div>
  );
}
