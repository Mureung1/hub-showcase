import { useState } from 'react';
import { AppShell } from '../../layouts/AppShell/AppShell';
import { Card, Row, Button, Field, Segmented, Switch, Slider, BottomSheet } from '../../components';
import text from '../../styles/text.module.css';
import styles from './InputPage.module.css';

interface Exam {
  subject: string;
  date: string;
  time: string;
  studyHours: number;
}

interface CaffeineIntake {
  label: string;
  mg: number;
  time: string;
}

// docs/디자인.md 9번: DB 참고 데이터(caffeine_reference)에서 내려받아야 할 목록. 지금은 자리표시용.
const DRINK_PRESETS = [
  { label: '아이스 아메리카노 (톨)', mg: 150, icon: '☕' },
  { label: '에너지 드링크', mg: 80, icon: '🥤' },
  { label: '커피믹스 1포', mg: 60, icon: '🍵' },
];

export function InputPage() {
  const [exams, setExams] = useState<Exam[]>([
    { subject: '세포생물학', date: '', time: '', studyHours: 3 },
    { subject: '유전학', date: '', time: '', studyHours: 5 },
    { subject: '생화학', date: '', time: '', studyHours: 6 },
  ]);
  const [bedtime, setBedtime] = useState('00:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [caffeineIntakes, setCaffeineIntakes] = useState<CaffeineIntake[]>([
    { label: '아이스 아메리카노', mg: 150, time: '오늘 09:00' },
  ]);
  const [sensitivity, setSensitivity] = useState<'둔감' | '보통' | '예민'>('보통');
  const [age, setAge] = useState(23);
  const [gender, setGender] = useState<'여성' | '남성'>('여성');
  const [pregnant, setPregnant] = useState(false);
  const [heartCondition, setHeartCondition] = useState(false);
  const [anxiety, setAnxiety] = useState(false);
  const [minSleepHours, setMinSleepHours] = useState(4);
  const [travelMinutes, setTravelMinutes] = useState(30);

  const [examSheetOpen, setExamSheetOpen] = useState(false);
  const [drinkSheetOpen, setDrinkSheetOpen] = useState(false);
  const [newExam, setNewExam] = useState<Exam>({ subject: '', date: '', time: '', studyHours: 4 });

  const totalCaffeineMg = caffeineIntakes.reduce((sum, intake) => sum + intake.mg, 0);

  function addExam() {
    if (!newExam.subject) return;
    setExams((prev) => [...prev, newExam]);
    setNewExam({ subject: '', date: '', time: '', studyHours: 4 });
    setExamSheetOpen(false);
  }

  function addDrink(label: string, mg: number) {
    setCaffeineIntakes((prev) => [...prev, { label, mg, time: '방금' }]);
    setDrinkSheetOpen(false);
  }

  return (
    <AppShell
      title="정보 입력"
      step={2}
      backTo="/"
      footer={
        <Button to="/processing" variant="primary">
          계산하기
        </Button>
      }
    >
      <h1 className={text.headline}>상황을 알려주세요</h1>
      <p className={text.subtext} style={{ marginBottom: 20 }}>
        직접 입력하거나, 자연어로 빠르게 채워보세요.
      </p>

      <div className={styles.nlBox}>
        <div className={styles.nlTitle}>✨ 자연어로 빠르게 입력 (선택)</div>
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
            />
          ))}
          <Row isAdd title="시험 추가" onClick={() => setExamSheetOpen(true)} />
        </Card>
      </div>

      <div className={text.sectionBlock}>
        <div className={text.sectionHead}>
          <span className={text.label}>평소 수면 패턴</span>
        </div>
        <Card style={{ display: 'flex', gap: 12 }}>
          <Field label="평소 취침" style={{ margin: 0, flex: 1 }}>
            <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
          </Field>
          <Field label="평소 기상" style={{ margin: 0, flex: 1 }}>
            <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
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
              subtitle={intake.time}
              value={`${intake.mg}mg`}
            />
          ))}
          <Row isAdd title="음료 추가" onClick={() => setDrinkSheetOpen(true)} />
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
            <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} placeholder="나이" />
          </Field>
          <Field label="성별" style={{ marginBottom: 14 }}>
            <Segmented
              options={[
                { label: '여성', value: '여성' },
                { label: '남성', value: '남성' },
              ]}
              value={gender}
              onChange={setGender}
            />
          </Field>
          <div className={text.hairline} />
          <Row title="임신 중이에요" right={<Switch checked={pregnant} onChange={setPregnant} label="임신 중이에요" />} />
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
            name="최소 수면시간"
            value={minSleepHours}
            min={2}
            max={8}
            step={0.5}
            suffix="시간"
            bounds={['2시간', '8시간']}
            onChange={setMinSleepHours}
          />
        </Card>
      </div>

      <div className={text.sectionBlock}>
        <Field
          label="시험장까지 이동시간"
          hint="기상 후 준비·이동에 필요한 시간만큼 목표 각성 시각을 앞당겨 계산해요."
        >
          <input
            type="number"
            value={travelMinutes}
            onChange={(e) => setTravelMinutes(Number(e.target.value))}
            placeholder="분 단위로 입력"
          />
        </Field>
      </div>

      <BottomSheet open={examSheetOpen} onClose={() => setExamSheetOpen(false)} title="시험 추가">
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
              value={newExam.time}
              onChange={(e) => setNewExam((prev) => ({ ...prev, time: e.target.value }))}
            />
          </Field>
        </div>
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
        <Button variant="primary" onClick={addExam}>
          추가하기
        </Button>
      </BottomSheet>

      <BottomSheet open={drinkSheetOpen} onClose={() => setDrinkSheetOpen(false)} title="방금 마신 음료 선택">
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
    </AppShell>
  );
}
