import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell/AppShell';
import { Card, Button, WarningBanner, WeekSchedule } from '../../components';
import text from '../../styles/text.module.css';
import styles from './ResultPage.module.css';
import { useSchedule } from '../../context/ScheduleContext';
import type { StudyReservation } from '../../api/calculateSchedule';
import { buildCalendarData, buildDaySummaries, buildSummary } from './formatSchedule';
import { buildChartGeometry, VIEW_HEIGHT, type ChartGeometry } from './buildChart';
import { saveSchedule } from '../../storage/savedSchedules';

export function ResultPage() {
  const { request, response, setRequest } = useSchedule();
  const navigate = useNavigate();
  const [saveError, setSaveError] = useState<string | null>(null);
  // ② "공부 시간 확보할까요?"에서 "아니오(이대로 잘게요)"를 누르면 이 화면에선 다시 안 묻는다.
  const [studyPromptDismissed, setStudyPromptDismissed] = useState(false);

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

  // ② "네, 공부 시간 확보할게요" — 잠을 줄여서라도 공부 시간을 확보하도록 reserveStudyTime=true로 다시 계산한다.
  function handleReserveStudy() {
    if (request === null) return;
    setRequest({ ...request, reserveStudyTime: true });
    navigate('/processing');
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

      {/* ② 공부 시간 확보 안내 — studyReservation은 예전에 저장된 응답엔 없을 수 있어 옵셔널로 다룬다 */}
      <StudyReservationPrompt
        reservation={response.studyReservation}
        dismissed={studyPromptDismissed}
        onReserve={handleReserveStudy}
        onDismiss={() => setStudyPromptDismissed(true)}
      />

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
 * ② 남은 공부량 안내(2026-07-30). 추천 스케줄에서 공부 시간이 부족하면
 *  - 아직 안 물어본 상태: "공부 시간을 확보할까요?" + [네/아니오]. 네를 누르면 reserveStudyTime=true로 재계산.
 *  - 이미 "공부 우선"으로 계산했는데도 부족: 더 줄일 수 없다는 안내만.
 * studyReservation은 예전에 저장된 응답엔 없을 수 있어 옵셔널로 받는다.
 */
function StudyReservationPrompt({
  reservation,
  dismissed,
  onReserve,
  onDismiss,
}: {
  reservation?: StudyReservation;
  dismissed: boolean;
  onReserve: () => void;
  onDismiss: () => void;
}) {
  if (!reservation || reservation.totalShortfallHours <= 0) return null;

  const fmt = (h: number) => (Number.isInteger(h) ? `${h}` : h.toFixed(1));
  const shortExams = reservation.byExam.filter((exam) => exam.shortfallHours > 0);

  // 이미 "공부 우선"으로 계산했는데도 남는 부족분 — 물리적으로 더 못 줄이는 상황이라 안내만 한다.
  if (reservation.enforced) {
    return (
      <WarningBanner>
        공부 시간을 최대한 확보했어요. 다만 남은 시간이 부족해 아직 {fmt(reservation.totalShortfallHours)}시간
        모자라요.
      </WarningBanner>
    );
  }

  // 아직 안 물어봤고(enforced 아님) 사용자가 닫지도 않았을 때만 선택지를 띄운다.
  if (dismissed) return null;

  return (
    <Card>
      <div className={text.label} style={{ marginBottom: 6 }}>
        공부 시간이 부족해요
      </div>
      <p className={text.subtext} style={{ marginBottom: shortExams.length > 0 ? 10 : 14 }}>
        추천 스케줄대로면 시험 전에 공부할 시간이 총 {fmt(reservation.totalShortfallHours)}시간 부족해요. 잠을 조금
        줄여서 공부 시간을 확보할까요?
      </p>
      {shortExams.length > 0 && (
        <ul style={{ margin: '0 0 14px', paddingLeft: 18 }}>
          {shortExams.map((exam) => (
            <li key={exam.subject} className={text.subtext} style={{ marginBottom: 2 }}>
              {exam.subject}: {fmt(exam.requiredHours)}시간 필요 / {fmt(exam.availableHours)}시간 확보
              <b> ({fmt(exam.shortfallHours)}시간 부족)</b>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="primary" onClick={onReserve}>
          네, 공부 시간 확보할게요
        </Button>
        <Button variant="secondary" onClick={onDismiss}>
          아니오, 이대로 잘게요
        </Button>
      </div>
    </Card>
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
