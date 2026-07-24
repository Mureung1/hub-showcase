import { BottomSheet } from '../BottomSheet/BottomSheet';
import { Row } from '../Row/Row';
import styles from './CalendarDaySheet.module.css';

/** 하루치 상세. 모든 값은 이미 사람이 읽을 문자열로 포맷된 상태로 들어온다(포맷은 부모가 담당) */
export interface CalendarDayDetail {
  /** 예) "7/25(금)" — 시트 제목 */
  dateLabel: string;
  /** 이 날 시험들 */
  exams: { subject: string; time: string }[];
  /** 이 날 아침 기상까지의 수면(전날 저녁 취침 → 이 날 기상). 없으면 null */
  sleep: { bedTime: string; wakeTime: string } | null;
  /** 이 날 카페인 섭취 */
  caffeine: { time: string; cups: string }[];
}

interface CalendarDaySheetProps {
  open: boolean;
  onClose: () => void;
  detail: CalendarDayDetail | null;
}

/**
 * #27 — 캘린더에서 날짜를 눌렀을 때 올라오는 상세 시트.
 * 홈·결과 화면이 같은 컴포넌트를 쓰고, 어떤 데이터를 넣을지만 부모가 정한다.
 * 표현 전용이라 계산/포맷은 하지 않는다.
 */
export function CalendarDaySheet({ open, onClose, detail }: CalendarDaySheetProps) {
  if (detail === null) return null;

  const { dateLabel, exams, sleep, caffeine } = detail;
  const 아무것도없음 = exams.length === 0 && sleep === null && caffeine.length === 0;

  return (
    <BottomSheet open={open} onClose={onClose} title={dateLabel}>
      {아무것도없음 ? (
        <p className={styles.empty}>등록된 일정이 없어요.</p>
      ) : (
        <div className={styles.list}>
          {exams.map((exam) => (
            <Row
              key={`exam-${exam.subject}-${exam.time}`}
              icon="📚"
              iconVariant="exam"
              title={exam.subject || '이름 없는 시험'}
              subtitle="시험"
              value={exam.time}
            />
          ))}

          {sleep && (
            <Row
              icon="🌙"
              iconVariant="sleep"
              title="수면"
              subtitle={`${sleep.bedTime} 취침 → ${sleep.wakeTime} 기상`}
            />
          )}

          {caffeine.map((dose) => (
            <Row
              key={`caffeine-${dose.time}`}
              icon="☕"
              iconVariant="caffeine"
              title={`커피 ${dose.cups}`}
              subtitle={`${dose.time} 섭취`}
            />
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
