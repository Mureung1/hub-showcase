import { AppShell } from '../../layouts/AppShell/AppShell';
import { Card, Row, Button } from '../../components';
import text from '../../styles/text.module.css';

// TODO(동적 데이터, docs/디자인.md 9번): 아래 값들은 저장된 계산 기록 중 가장 가까운 시험에서 채워야 함.
// 최초 접속(저장 기록 없음)일 때 보여줄 문구는 아직 별도 결정 전.
const nearestExam = {
  dDay: 'D-2',
  subject: '생화학',
  scheduleSummary: '금요일 10:00 시작 · 지금부터 계산하면 취침·기상·카페인 스케줄을 바로 알려드려요.',
};

const recentRecord = {
  title: '생화학 외 2개 시험',
  subtitle: '2026.07.06 저장 · 화 05:30 기상 스케줄',
};

export function HomePage() {
  return (
    <AppShell
      title="☕ 시험 벼락치기 스케줄러"
      step={1}
      footer={
        <Button to="/input" variant="primary">
          새 스케줄 만들기
        </Button>
      }
    >
      <div className={text.eyebrow}>가장 가까운 시험 ⌄</div>
      <h1 className={text.displayNum}>
        {nearestExam.dDay} · {nearestExam.subject}
      </h1>
      <p className={text.subtext}>{nearestExam.scheduleSummary}</p>

      <div className={text.sectionBlock}>
        <div className={text.sectionHead}>
          <span className={text.label}>최근 계산 기록</span>
          <span className={text.meta}>이 브라우저에 저장됨</span>
        </div>
        <Card>
          <Row
            href="/result"
            icon="🗓️"
            iconVariant="exam"
            title={recentRecord.title}
            subtitle={recentRecord.subtitle}
            chevron
          />
        </Card>
      </div>

      <div className={text.sectionBlock}>
        <div className={text.sectionHead}>
          <span className={text.label}>이렇게 계산해요</span>
        </div>
        <Card>
          <Row icon="🌙" iconVariant="sleep" title="Two-Process Model" subtitle="수면압(Process S) + 일주기리듬(Process C)" />
          <Row icon="☕" iconVariant="caffeine" title="카페인 상호작용 모델(UMP)" subtitle="아데노신 수용체 억제 효과 반영" />
          <Row icon="📚" iconVariant="exam" title="다중 시험 통합 최적화" subtitle="이번 주 시험 전체를 한 번에 고려" />
        </Card>
      </div>
    </AppShell>
  );
}
