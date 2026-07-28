import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell/AppShell';
import { Card, Row, Button, Calendar, CalendarDaySheet } from '../../components';
import text from '../../styles/text.module.css';
import styles from './HomePage.module.css';
import { useSchedule } from '../../context/ScheduleContext';
import {
  deleteSchedule,
  findNearestUpcomingExam,
  loadSavedSchedules,
  type SavedSchedule,
} from '../../storage/savedSchedules';
import {
  buildCalendarData,
  buildDayDetail,
  formatKstDate,
  formatKstDateTime,
  formatKstTime,
} from '../Result/formatSchedule';

export function HomePage() {
  const navigate = useNavigate();
  const { setRequest, setResponse, setStatus } = useSchedule();

  // 화면이 뜰 때 한 번 읽어 상태로 들고 있는다. 저장은 결과 화면에서 일어나고, 삭제(#40)는
  // 여기서 일어나므로 삭제 후 목록이 바로 다시 그려지도록 useState로 관리한다.
  const [records, setRecords] = useState<SavedSchedule[]>(() => loadSavedSchedules());
  // #40 — 삭제 전 확인 중인 기록 id. null이면 확인 중인 게 없음.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const latest = records[0] ?? null;
  const nearestExam = useMemo(() => findNearestUpcomingExam(latest), [latest]);

  // #27 — 홈 캘린더는 가장 최근 계산을 보여준다. 기록이 없으면 오늘이 든 달만 평범하게.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const calendar = latest ? buildCalendarData(latest.response, latest.request) : null;
  const todayKey = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
  const dayDetail =
    latest && selectedDate ? buildDayDetail(latest.response, latest.request, selectedDate) : null;

  /** 저장된 기록을 다시 열어본다 — 보관함에 넣고 결과 화면으로 */
  function openRecord(record: SavedSchedule) {
    setRequest(record.request);
    setResponse(record.response);
    setStatus('success');
    navigate('/result');
  }

  /** #40 — 확인을 거친 뒤 실제로 지운다. localStorage와 화면 목록 둘 다에서 사라진다. */
  function confirmDelete(id: string) {
    setRecords(deleteSchedule(id));
    setConfirmingId(null);
  }

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
      {nearestExam ? (
        <>
          <div className={text.eyebrow}>가장 가까운 시험</div>
          <h1 className={text.displayNum}>
            {nearestExam.daysLeft === 0 ? 'D-DAY' : `D-${nearestExam.daysLeft}`} · {nearestExam.subject}
          </h1>
          <p className={text.subtext}>
            {formatKstDateTime(nearestExam.examDateTime)} 시작
            <br />
            저장된 스케줄을 눌러 취침·기상·카페인 계획을 다시 볼 수 있어요.
          </p>
        </>
      ) : (
        <>
          <div className={text.eyebrow}>가장 가까운 시험</div>
          <h1 className={text.headline}>아직 등록된 시험이 없어요</h1>
          <p className={text.subtext}>
            시험 일정을 입력하면
            <br />
            취침·기상·카페인 스케줄을 바로 알려드려요.
          </p>
        </>
      )}

      <div className={text.sectionBlock}>
        <div className={text.sectionHead}>
          <span className={text.label}>최근 계산 기록</span>
          <span className={text.meta}>이 브라우저에 저장됨</span>
        </div>
        <Card>
          {records.length === 0 ? (
            // 기록이 없을 때 빈 카드만 두면 고장난 것처럼 보인다(2026-07-22)
            <Row icon="🗓️" iconVariant="exam" title="최근 계산 내용 없음" subtitle="계산 후 저장하면 여기에 남아요" />
          ) : (
            records.map((record) =>
              confirmingId === record.id ? (
                // #40 — 삭제 확인 줄. 실수로 지우지 않도록 한 번 더 물어본다.
                <div key={record.id} className={styles.confirmRow}>
                  <span className={styles.confirmText}>이 기록을 삭제할까요?</span>
                  <div className={styles.confirmActions}>
                    <button
                      type="button"
                      className={`${styles.confirmBtn} ${styles.cancelBtn}`}
                      onClick={() => setConfirmingId(null)}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      className={`${styles.confirmBtn} ${styles.deleteBtn}`}
                      onClick={() => confirmDelete(record.id)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ) : (
                <Row
                  key={record.id}
                  icon="🗓️"
                  iconVariant="exam"
                  title={summarizeExams(record)}
                  subtitle={summarizeSchedule(record)}
                  chevron
                  onClick={() => openRecord(record)}
                  onDelete={() => setConfirmingId(record.id)}
                  deleteLabel={`${summarizeExams(record)} 기록 삭제`}
                />
              ),
            )
          )}
        </Card>
      </div>

      {/* #27 — "이렇게 계산해요"(모델 설명) 자리에 시험 캘린더. 기록이 있으면 시험일·스케줄을
          표시하고 날짜를 눌러 상세를 본다. 기록이 없으면 오늘이 든 달만 평범하게 보여준다. */}
      <div className={text.sectionBlock}>
        <div className={text.sectionHead}>
          <span className={text.label}>시험 캘린더</span>
        </div>
        <Card>
          <Calendar
            rangeStart={calendar?.rangeStart ?? todayKey}
            rangeEnd={calendar?.rangeEnd ?? todayKey}
            marks={calendar?.marks}
            onSelectDate={latest ? setSelectedDate : undefined}
          />
        </Card>
      </div>

      <CalendarDaySheet
        open={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        detail={dayDetail}
      />
    </AppShell>
  );
}

/** "생화학 외 2개 시험" */
function summarizeExams(record: SavedSchedule): string {
  const exams = record.request.exams;
  if (exams.length === 0) return '시험 없음';
  const 첫과목 = exams[0].subject || '이름 없는 시험';
  return exams.length === 1 ? `${첫과목} 시험` : `${첫과목} 외 ${exams.length - 1}개 시험`;
}

/** "7/22(수) 저장 · 7/23(목) 06:45 기상 스케줄" */
function summarizeSchedule(record: SavedSchedule): string {
  const 첫밤 = record.response.recommendedSchedule.nights[0];
  const 저장 = `${formatKstDate(record.savedAt)} 저장`;
  if (!첫밤) return 저장;
  return `${저장} · ${formatKstDate(첫밤.wakeTime)} ${formatKstTime(첫밤.wakeTime)} 기상 스케줄`;
}
