import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell/AppShell';
import { Card, Row, Button, Field, Segmented, Switch, Slider, BottomSheet, WarningBanner } from '../../components';
import text from '../../styles/text.module.css';
import styles from './InputPage.module.css';
import { buildScheduleRequest, validateInputForm, type CaffeineIntake, type Exam } from './buildScheduleRequest';
import { useSchedule } from '../../context/ScheduleContext';

/**
 * 지금 시각을 "HH:MM"으로. 음료 추가 시트를 열 때 기본값으로 쓴다.
 * 입력칸이 10분 단위(step=600)라 기본값도 10분 단위로 내림한다 — 안 맞으면
 * 브라우저가 값을 잘못된 것으로 표시한다(2026-07-22).
 */
function nowHhMm(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(Math.floor(now.getMinutes() / 10) * 10).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * 오늘로부터 days일 뒤 날짜를 한국 기준 "YYYY-MM-DD"로. 기본 예시 시험의 날짜에 쓴다(#29).
 * 'sv-SE' 로케일이 "YYYY-MM-DD" 형태를 준다.
 */
function kstDatePlusDays(days: number): string {
  const target = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(target);
}

// docs/디자인.md 9번: DB 참고 데이터(caffeine_reference)에서 내려받아야 할 목록. 지금은 자리표시용.
const DRINK_PRESETS = [
  { label: '아이스 아메리카노 (톨)', mg: 150, icon: '☕' },
  { label: '에너지 드링크', mg: 80, icon: '🥤' },
  { label: '커피믹스 1포', mg: 60, icon: '🍵' },
];

export function InputPage() {
  const navigate = useNavigate();
  const { setRequest, setStatus, setErrorMessage } = useSchedule();
  /** 계산하기를 눌렀을 때 막힌 이유. null이면 문제 없음 */
  const [formError, setFormError] = useState<string | null>(null);
  /** 시험 추가·수정 시트에서 막힌 이유 */
  const [examSheetError, setExamSheetError] = useState<string | null>(null);

  // #29 — 빈 날짜 상태가 기본값으로 존재하지 않도록 예시 시험 하나만 두고, 날짜는 계산
  // 가능한 값(오늘+2일 — 백엔드가 '내일 이후'만 받음)으로 채워 시드한다.
  const [exams, setExams] = useState<Exam[]>([
    { subject: '세포생물학', date: kstDatePlusDays(2), time: '09:00', studyHours: 3 },
  ]);
  const [bedtime, setBedtime] = useState('00:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [caffeineIntakes, setCaffeineIntakes] = useState<CaffeineIntake[]>([
    { label: '아이스 아메리카노', mg: 150, time: '09:00' },
  ]);
  const [sensitivity, setSensitivity] = useState<'둔감' | '보통' | '예민'>('보통');
  // 숫자를 다 지웠을 때 0이 남지 않도록 빈 문자열도 허용한다(2026-07-22). 계산 직전에 검증한다.
  const [age, setAge] = useState<number | ''>(23);
  const [weightKg, setWeightKg] = useState<number | ''>(65);
  const [gender, setGender] = useState<'여성' | '남성'>('여성');
  const [pregnant, setPregnant] = useState(false);
  const [oralContraceptive, setOralContraceptive] = useState(false);
  const [heartCondition, setHeartCondition] = useState(false);
  const [anxiety, setAnxiety] = useState(false);
  const [minSleepHours, setMinSleepHours] = useState(4);

  const [examSheetOpen, setExamSheetOpen] = useState(false);
  const [drinkSheetOpen, setDrinkSheetOpen] = useState(false);
  const [newDrinkTime, setNewDrinkTime] = useState(nowHhMm);
  const [newExam, setNewExam] = useState<Exam>({ subject: '', date: '', time: '', studyHours: 4 });
  const [editingExamIndex, setEditingExamIndex] = useState<number | null>(null);
  const [examActionIndex, setExamActionIndex] = useState<number | null>(null);
  const [caffeineActionIndex, setCaffeineActionIndex] = useState<number | null>(null);

  const totalCaffeineMg = caffeineIntakes.reduce((sum, intake) => sum + intake.mg, 0);

  // 남성으로 바꾸면 임신·경구피임약 토글이 화면에서 사라지는데, 값까지 같이 꺼주지 않으면
  // 안 보이는 채로 켜진 값이 그대로 서버에 실려간다(2026-07-22 #16).
  function handleGenderChange(next: '여성' | '남성') {
    setGender(next);
    if (next === '남성') {
      setPregnant(false);
      setOralContraceptive(false);
    }
  }

  function openAddExam() {
    setEditingExamIndex(null);
    setNewExam({ subject: '', date: '', time: '', studyHours: 4 });
    setExamSheetError(null);
    setExamSheetOpen(true);
  }

  function openEditExam(index: number) {
    setEditingExamIndex(index);
    setNewExam(exams[index]);
    setExamActionIndex(null);
    setExamSheetError(null);
    setExamSheetOpen(true);
  }

  // 시험을 저장하는 시점에 막는다(2026-07-22) — 계산하기에서 막으면 어느 시험이 문제인지
  // 확인하러 다시 시트를 열어야 해서, 값을 넣는 자리에서 바로 알려주는 게 낫다.
  function saveExam() {
    if (!newExam.subject) {
      setExamSheetError('과목명을 입력해주세요.');
      return;
    }
    if (!newExam.date || !newExam.time) {
      setExamSheetError('시험 날짜와 시각을 모두 입력해주세요.');
      return;
    }
    setExamSheetError(null);

    if (editingExamIndex !== null) {
      setExams((prev) => prev.map((exam, i) => (i === editingExamIndex ? newExam : exam)));
    } else {
      setExams((prev) => [...prev, newExam]);
    }
    setNewExam({ subject: '', date: '', time: '', studyHours: 4 });
    setEditingExamIndex(null);
    setExamSheetOpen(false);
  }

  function deleteExam(index: number) {
    setExams((prev) => prev.filter((_, i) => i !== index));
    setExamActionIndex(null);
  }

  // 시트를 열 때마다 시각을 "지금"으로 되돌린다. 대부분 방금 마신 걸 넣으므로
  // 기본값이 지금이면 대개 그냥 고르기만 하면 된다.
  function openAddDrink() {
    setNewDrinkTime(nowHhMm());
    setDrinkSheetOpen(true);
  }

  function addDrink(label: string, mg: number) {
    setCaffeineIntakes((prev) => [...prev, { label, mg, time: newDrinkTime }]);
    setDrinkSheetOpen(false);
  }

  // 계산하기 — 검증을 통과하면 화면 값을 서버 요청 모양으로 바꿔서 보관함에 담고 처리중 화면으로.
  // 실제 서버 호출은 처리중 화면이 맡는다(#17).
  function handleCalculate() {
    const form = {
      exams,
      bedtime,
      wakeTime,
      caffeineIntakes,
      sensitivity,
      age,
      weightKg,
      gender,
      pregnant,
      oralContraceptive,
      heartCondition,
      anxiety,
      minSleepHours,
    };

    const 문제 = validateInputForm(form);
    if (문제 !== null) {
      setFormError(문제);
      return;
    }

    setFormError(null);
    setRequest(buildScheduleRequest(form));
    setErrorMessage(null);
    setStatus('loading');
    navigate('/processing');
  }

  function deleteCaffeine(index: number) {
    setCaffeineIntakes((prev) => prev.filter((_, i) => i !== index));
    setCaffeineActionIndex(null);
  }

  return (
    <AppShell
      title="정보 입력"
      step={2}
      backTo="/"
      footer={
        <>
          {/* 버튼 바로 위에 띄운다 — 화면 위쪽에 있으면 눌렀을 때 안 보일 수 있어서 */}
          {formError !== null && <WarningBanner>{formError}</WarningBanner>}
          <Button variant="primary" onClick={handleCalculate}>
            계산하기
          </Button>
        </>
      }
    >
      <h1 className={text.headline}>상황을 알려주세요</h1>
      <p className={text.subtext} style={{ marginBottom: 20 }}>
        직접 입력하거나, 문장으로 설명하면 자동으로 채워드려요.
      </p>

      <div className={styles.nlBox}>
        <div className={styles.nlTitle}>✨ 문장으로 빠르게 입력 (선택)</div>
        <textarea placeholder="예) 시험이 모레 아침 9시에 있고, 평소엔 12시에 자서 7시에 일어나." />
        <div className={styles.nlActions}>
          <Button variant="secondary" size="sm">
            아래 항목에 채우기
          </Button>
        </div>
      </div>

      <div className={`${text.sectionBlock} ${text.sectionBlockTight}`}>
        <div className={text.sectionHead}>
          <span className={text.label}>시험 일정</span>
          <span className={text.meta}>{exams.length}개</span>
        </div>
        <Card>
          {exams.map((exam, index) => (
            <Row
              key={`${exam.subject}-${index}`}
              icon="🗓️"
              iconVariant="exam"
              title={exam.subject}
              subtitle={[exam.time, exam.date, `남은 공부 ${exam.studyHours}시간`].filter(Boolean).join(' · ')}
              chevron
              onClick={() => setExamActionIndex(index)}
            />
          ))}
          <Row isAdd title="시험 추가" onClick={openAddExam} />
        </Card>
      </div>

      <div className={text.sectionBlock}>
        <div className={text.sectionHead}>
          <span className={text.label}>평소 수면 패턴</span>
        </div>
        <Card style={{ display: 'flex', gap: 12 }}>
          <Field label="평소 취침" style={{ margin: 0, flex: 1 }}>
            {/* step=600초(10분) — 1분 단위면 스크롤이 너무 길어진다(2026-07-22) */}
            <input type="time" step={600} value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
          </Field>
          <Field label="평소 기상" style={{ margin: 0, flex: 1 }}>
            <input type="time" step={600} value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
          </Field>
        </Card>
      </div>

      <div className={text.sectionBlock}>
        <div className={text.sectionHead}>
          <span className={text.label}>오늘 이미 섭취한 카페인</span>
          <span className={text.meta}>{totalCaffeineMg}mg</span>
        </div>
        <Card>
          {caffeineIntakes.map((intake, index) => (
            <Row
              key={`${intake.label}-${index}`}
              icon="☕"
              iconVariant="caffeine"
              title={intake.label}
              subtitle={`오늘 ${intake.time}`}
              value={`${intake.mg}mg`}
              chevron
              onClick={() => setCaffeineActionIndex(index)}
            />
          ))}
          <Row isAdd title="음료 추가" onClick={openAddDrink} />
        </Card>
      </div>

      <div className={text.sectionBlock}>
        <div className={text.sectionHead}>
          <span className={text.label}>카페인 민감도</span>
        </div>
        <Segmented
          options={[
            { label: '둔감', value: '둔감' },
            { label: '보통', value: '보통' },
            { label: '예민', value: '예민' },
          ]}
          value={sensitivity}
          onChange={setSensitivity}
        />
      </div>

      <div className={text.sectionBlock}>
        <div className={text.sectionHead}>
          <span className={text.label}>나이 · 성별 · 건강 상태</span>
        </div>
        <Card>
          <Field label="나이" style={{ marginBottom: 14 }}>
            {/* 다 지우면 0이 아니라 빈칸이 되어야 한다 — 0이 남으면 "021"처럼 입력됨(2026-07-22) */}
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="나이"
            />
          </Field>
          <Field label="체중 (kg)" style={{ marginBottom: 14 }}>
            <input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="체중"
            />
          </Field>
          <Field label="성별" style={{ marginBottom: 14 }}>
            <Segmented
              options={[
                { label: '여성', value: '여성' },
                { label: '남성', value: '남성' },
              ]}
              value={gender}
              onChange={handleGenderChange}
            />
          </Field>
          <div className={text.hairline} />
          {gender === '여성' && (
            <>
              <Row
                title="임신 중이에요"
                right={<Switch checked={pregnant} onChange={setPregnant} label="임신 중이에요" />}
              />
              <Row
                title="경구피임약을 복용 중이에요"
                right={
                  <Switch
                    checked={oralContraceptive}
                    onChange={setOralContraceptive}
                    label="경구피임약을 복용 중이에요"
                  />
                }
              />
            </>
          )}
          <Row
            title="심장질환이 있어요"
            right={<Switch checked={heartCondition} onChange={setHeartCondition} label="심장질환이 있어요" />}
          />
          <Row
            title="평소 불안·불면 증상이 있어요"
            right={<Switch checked={anxiety} onChange={setAnxiety} label="평소 불안·불면 증상이 있어요" />}
          />
        </Card>
      </div>

      <div className={text.sectionBlock}>
        <Card>
          <Slider
            name="원하는 최소 수면시간"
            value={minSleepHours}
            min={2}
            max={8}
            step={0.5}
            suffix="시간"
            bounds={['2시간', '8시간']}
            onChange={setMinSleepHours}
          />
        </Card>
        <WarningBanner>기상 후 준비, 이동에 필요한 시간만큼 목표 각성 시각을 조절해보세요.</WarningBanner>
      </div>

      <BottomSheet
        open={examSheetOpen}
        onClose={() => setExamSheetOpen(false)}
        title={editingExamIndex !== null ? '시험 수정' : '시험 추가'}
      >
        <Field label="과목명">
          <input
            type="text"
            placeholder="예) 유기화학"
            value={newExam.subject}
            onChange={(e) => setNewExam((prev) => ({ ...prev, subject: e.target.value }))}
          />
        </Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="날짜" style={{ flex: 1 }}>
            <input
              type="date"
              value={newExam.date}
              onChange={(e) => setNewExam((prev) => ({ ...prev, date: e.target.value }))}
            />
          </Field>
          <Field label="시각" style={{ flex: 1 }}>
            <input
              type="time"
              step={600}
              value={newExam.time}
              onChange={(e) => setNewExam((prev) => ({ ...prev, time: e.target.value }))}
            />
          </Field>
        </div>
        {examSheetError !== null && <WarningBanner>{examSheetError}</WarningBanner>}
        <div style={{ marginBottom: 18 }}>
          <Slider
            name="남은 공부 시간"
            value={newExam.studyHours}
            min={0}
            max={40}
            step={1}
            suffix="시간"
            bounds={['0시간', '40시간 (5일치)']}
            onChange={(value) => setNewExam((prev) => ({ ...prev, studyHours: value }))}
          />
        </div>
        <Button variant="primary" onClick={saveExam}>
          {editingExamIndex !== null ? '수정하기' : '추가하기'}
        </Button>
      </BottomSheet>

      <BottomSheet open={drinkSheetOpen} onClose={() => setDrinkSheetOpen(false)} title="마신 음료 선택">
        <Field label="마신 시각 (오늘)" style={{ marginBottom: 14 }}>
          <input type="time" step={600} value={newDrinkTime} onChange={(e) => setNewDrinkTime(e.target.value)} />
        </Field>
        {DRINK_PRESETS.map((drink) => (
          <Row
            key={drink.label}
            icon={drink.icon}
            iconVariant="caffeine"
            title={drink.label}
            value={`${drink.mg}mg`}
            onClick={() => addDrink(drink.label, drink.mg)}
          />
        ))}
        <Row isAdd title="직접 입력" onClick={() => setDrinkSheetOpen(false)} />
      </BottomSheet>

      <BottomSheet
        open={examActionIndex !== null}
        onClose={() => setExamActionIndex(null)}
        title={examActionIndex !== null ? exams[examActionIndex].subject : ''}
      >
        <button type="button" className={styles.actionRow} onClick={() => openEditExam(examActionIndex!)}>
          세부 사항 수정하기
        </button>
        <button
          type="button"
          className={`${styles.actionRow} ${styles.actionRowDanger}`}
          onClick={() => deleteExam(examActionIndex!)}
        >
          삭제하기
        </button>
      </BottomSheet>

      <BottomSheet
        open={caffeineActionIndex !== null}
        onClose={() => setCaffeineActionIndex(null)}
        title={caffeineActionIndex !== null ? caffeineIntakes[caffeineActionIndex].label : ''}
      >
        <button
          type="button"
          className={`${styles.actionRow} ${styles.actionRowDanger}`}
          onClick={() => deleteCaffeine(caffeineActionIndex!)}
        >
          삭제하기
        </button>
      </BottomSheet>
    </AppShell>
  );
}
