import { AppShell } from '../../layouts/AppShell/AppShell';
import { Card, Row, Button, WarningBanner } from '../../components';
import text from '../../styles/text.module.css';
import styles from './ResultPage.module.css';

// TODO(동적 데이터, docs/디자인.md 9번): 아래는 전부 계산 엔진(POST /api/schedule/calculate) 응답으로 채워야 하는
// alertnessTimeline / recommendedSchedule / warnings 예시 값이다. 계산 엔진 연동 전까지의 자리표시용 데이터.
const summary = {
  eyebrow: '오늘부터 금요일 시험까지',
  headline: '오늘 23:30 취침',
  subtext: '→ 월 05:30 기상 · 06:00 카페인 100mg 섭취 시, 세 시험 모두 시작 시각 예측 각성도가 가장 높아요.',
};

const warning = '오늘 카페인 총 섭취량이 안전 권장량(400mg)의 92%에 도달해요. 늦은 시간 추가 섭취는 피해주세요.';

const dailySchedule = [
  { title: '월 05:30 기상', subtitle: '06:00 카페인 100mg → 09:00 세포생물학' },
  { title: '수 06:00 기상', subtitle: '06:30 카페인 80mg → 14:00 유전학' },
  { title: '금 05:00 기상', subtitle: '05:30 카페인 100mg → 10:00 생화학' },
];

export function ResultPage() {
  return (
    <AppShell
      title="추천 스케줄"
      step={4}
      backTo="/input"
      footer={
        <>
          <Button to="/adjust" variant="secondary">
            조건 조정하기
          </Button>
          <Button to="/" variant="primary">
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
          <AlertnessChart />
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

      <WarningBanner>{warning}</WarningBanner>

      <div className={`${text.sectionBlock} ${text.sectionBlockTight}`}>
        <div className={text.sectionHead}>
          <span className={text.label}>날짜별 추천 스케줄</span>
        </div>
        <Card>
          {dailySchedule.map((day) => (
            <Row key={day.title} icon="🌙" iconVariant="sleep" title={day.title} subtitle={day.subtitle} />
          ))}
        </Card>
      </div>
    </AppShell>
  );
}

/** docs/디자인.md 5번 "차트 영역" — 실제로는 alertnessTimeline 응답으로 곡선/마커/라벨을 그려야 한다 */
function AlertnessChart() {
  return (
    <svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="alertFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9a5b28" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#9a5b28" stopOpacity="0" />
        </linearGradient>
      </defs>

      <line x1="70" y1="14" x2="70" y2="138" stroke="#d8c9b4" strokeWidth="1" strokeDasharray="3,3" />
      <line x1="205" y1="14" x2="205" y2="138" stroke="#d8c9b4" strokeWidth="1" strokeDasharray="3,3" />
      <line x1="300" y1="14" x2="300" y2="138" stroke="#d8c9b4" strokeWidth="1" strokeDasharray="3,3" />

      <text x="70" y="10" fontSize="9" textAnchor="middle" fill="#786a5c">월 09:00</text>
      <text x="205" y="10" fontSize="9" textAnchor="middle" fill="#786a5c">수 14:00</text>
      <text x="300" y="10" fontSize="9" textAnchor="middle" fill="#786a5c">금 10:00</text>

      <path
        d="M0,70 Q20,55 40,95 Q55,60 70,35 Q100,55 140,100 Q170,60 205,32 Q230,55 250,95 Q275,55 300,28 Q310,40 320,55 L320,140 L0,140 Z"
        fill="url(#alertFill)"
      />
      <path
        d="M0,70 Q20,55 40,95 Q55,60 70,35 Q100,55 140,100 Q170,60 205,32 Q230,55 250,95 Q275,55 300,28 Q310,40 320,55"
        fill="none"
        stroke="#7a4720"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <circle cx="70" cy="35" r="3.5" fill="#7a4720" stroke="#fff" strokeWidth="1.5" />
      <circle cx="205" cy="32" r="3.5" fill="#7a4720" stroke="#fff" strokeWidth="1.5" />
      <circle cx="300" cy="28" r="3.5" fill="#7a4720" stroke="#fff" strokeWidth="1.5" />

      <text x="10" y="155" fontSize="9" fill="#ab9d8c">오늘</text>
      <text x="70" y="155" fontSize="9" fill="#ab9d8c" textAnchor="middle">월</text>
      <text x="140" y="155" fontSize="9" fill="#ab9d8c" textAnchor="middle">화</text>
      <text x="205" y="155" fontSize="9" fill="#ab9d8c" textAnchor="middle">수</text>
      <text x="250" y="155" fontSize="9" fill="#ab9d8c" textAnchor="middle">목</text>
      <text x="300" y="155" fontSize="9" textAnchor="middle" fill="#ab9d8c">금</text>
    </svg>
  );
}
