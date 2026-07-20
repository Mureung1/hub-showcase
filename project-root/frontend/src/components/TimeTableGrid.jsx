// components/TimeTableGrid.jsx
import "./TimeTableGrid.css";

const DEFAULT_DAYS = ["월", "화", "수", "목", "금"];
const PX_PER_MIN = 56 / 60; // 1시간(60분) = 56px
const DEFAULT_START_MIN = 9 * 60; // 09:00
const DEFAULT_END_MIN = 18 * 60; // 18:00

// 시간표 블록 구분용 파스텔 팔레트 (상태 표시에는 사용하지 않음)
const PALETTE = [
  "#e7e2fb", "#e2f3fb", "#fbe9e2", "#e2ecfb", "#e2fbe8",
  "#fff3d6", "#fbe2ec", "#f5e2fb", "#e2fbf5", "#fff0e2",
];

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// lecture.times: [{ day, start, end }, ...] (lecture_time 테이블 row 형태 그대로, "HH:MM" 문자열)
// 같은 요일에서 끝시각과 다음 시작시각이 맞닿은 시간대는 하나의 블록으로 합쳐서 반환한다.
function buildBlocks(lectures) {
  const blocks = [];
  for (const lec of lectures) {
    const byDay = new Map();
    for (const t of lec.times) {
      if (!byDay.has(t.day)) byDay.set(t.day, []);
      byDay.get(t.day).push(t);
    }
    for (const [day, times] of byDay) {
      const sorted = [...times].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
      let runStart = sorted[0].start;
      let runEnd = sorted[0].end;
      const flushRun = () => {
        blocks.push({
          key: `${lec.id}-${day}-${runStart}`,
          lectureId: lec.id,
          subject: lec.name,
          professor: lec.professor,
          day,
          start: runStart,
          end: runEnd,
        });
      };
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start === runEnd) {
          runEnd = sorted[i].end;
          continue;
        }
        flushRun();
        runStart = sorted[i].start;
        runEnd = sorted[i].end;
      }
      flushRun();
    }
  }
  return blocks;
}

export default function TimeTableGrid({
  lectures = [],
  days = DEFAULT_DAYS,
  startTime,
  endTime,
}) {
  const blocks = buildBlocks(lectures);

  const blockStarts = blocks.map((b) => toMinutes(b.start));
  const blockEnds = blocks.map((b) => toMinutes(b.end));
  // 표시 범위는 09:00~18:00을 기본으로 하되, 이보다 이르거나 늦은 강의가 있으면 그만큼 넓힌다.
  const gridStartMin = startTime ? toMinutes(startTime) : Math.min(DEFAULT_START_MIN, ...blockStarts);
  const gridEndMin = endTime ? toMinutes(endTime) : Math.max(DEFAULT_END_MIN, ...blockEnds);
  const gridHeight = (gridEndMin - gridStartMin) * PX_PER_MIN;

  // 그리드 가로줄은 정시(clock hour) 기준으로 긋는다.
  const firstHour = Math.ceil(gridStartMin / 60);
  const lastHour = Math.floor(gridEndMin / 60);
  const hourMarks = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i);

  const subjectColorOf = (() => {
    const colorBySubject = new Map();
    return (subject) => {
      if (!colorBySubject.has(subject)) {
        colorBySubject.set(subject, PALETTE[colorBySubject.size % PALETTE.length]);
      }
      return colorBySubject.get(subject);
    };
  })();

  return (
    <div className="ttg">
      <div className="ttg__header">
        <div className="ttg__header-spacer" />
        {days.map((day) => (
          <div key={day} className="ttg__day-label">{day}</div>
        ))}
      </div>

      <div className="ttg__body" style={{ height: gridHeight }}>
        <div className="ttg__time-col">
          {hourMarks.map((h) => (
            <span
              key={h}
              className="ttg__time-label"
              style={{ top: (h * 60 - gridStartMin) * PX_PER_MIN }}
            >
              {h}
            </span>
          ))}
        </div>

        {days.map((day) => (
          <div
            key={day}
            className="ttg__day-col"
            style={{
              backgroundPosition: `0 ${-((firstHour * 60 - gridStartMin) * PX_PER_MIN)}px`,
              backgroundSize: `100% ${60 * PX_PER_MIN}px`,
            }}
          >
            {blocks
              .filter((b) => b.day === day)
              .map((b) => {
                const top = (toMinutes(b.start) - gridStartMin) * PX_PER_MIN;
                const height = (toMinutes(b.end) - toMinutes(b.start)) * PX_PER_MIN;
                return (
                  <div
                    key={b.key}
                    className="ttg__block"
                    style={{ top, height, background: subjectColorOf(b.subject) }}
                  >
                    <div className="ttg__block-subject">{b.subject}</div>
                    <div className="ttg__block-meta">{b.professor}</div>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
