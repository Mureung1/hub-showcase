/**
 * 개발용 seed 스크립트 — plan.md 페르소나(최범규) 시나리오 기반 샘플 데이터를 7개 테이블에 채운다.
 * 모든 날짜는 실행 시점의 "오늘"(Asia/Seoul) 기준 상대값이라, 언제 실행해도 오늘 날짜 데이터가 채워진다.
 * 재실행 시 기존 데이터를 모두 지우고 다시 채우므로 매번 동일한 상태로 초기화된다.
 * 실행: npx tsx server/scripts/seed.ts
 */
import { addDays, format, parseISO } from 'date-fns';
import { getSupabaseClient } from '../lib/supabaseClient';
import { getTodaySeoul } from '../services/briefingService';

const TABLES_TO_CLEAR = [
  'reminders',
  'routine_logs',
  'schedules',
  'tasks',
  'routines',
  'meals',
  'memos',
] as const;

function dateOffset(today: string, days: number): string {
  return format(addDays(parseISO(today), days), 'yyyy-MM-dd');
}

async function clearTables() {
  const client = getSupabaseClient();
  for (const table of TABLES_TO_CLEAR) {
    const { error } = await client.from(table).delete().not('id', 'is', null);
    if (error) throw new Error(`[seed] ${table} 초기화 실패: ${error.message}`);
  }
  console.log('[seed] 기존 데이터 초기화 완료');
}

async function seed() {
  const client = getSupabaseClient();
  const today = getTodaySeoul();

  // ===== schedules =====
  const { data: schedules, error: scheduleError } = await client
    .from('schedules')
    .insert([
      {
        title: '치과',
        date: dateOffset(today, 0),
        start_time: '15:00',
        end_time: null,
        raw_input: '오늘 3시 치과 예약',
      },
      {
        title: '대외활동 정기 모임',
        date: dateOffset(today, 0),
        start_time: '19:00',
        end_time: '21:00',
        raw_input: '오늘 저녁 7시 대외활동 정기모임',
      },
      {
        title: '팀플 회의',
        date: dateOffset(today, 7),
        start_time: '15:00',
        end_time: null,
        raw_input: '다음주 화요일 오후 3시 팀플 회의, 전날 알려줘',
      },
    ])
    .select('*');
  if (scheduleError) throw new Error(`[seed] schedules 삽입 실패: ${scheduleError.message}`);
  console.log(`[seed] schedules ${schedules.length}건 삽입`);

  // ===== tasks =====
  const { data: tasks, error: taskError } = await client
    .from('tasks')
    .insert([
      {
        title: '데이터베이스 과제 제출',
        deadline: dateOffset(today, 3),
        completed: false,
        raw_input: '금요일까지 데이터베이스 과제 제출',
      },
      {
        title: '알고리즘 과제 제출',
        deadline: dateOffset(today, 2),
        completed: false,
        raw_input: '알고리즘 과제 목요일까지',
      },
      {
        title: '공모전 서류 제출',
        deadline: dateOffset(today, 2),
        completed: false,
        raw_input: '공모전 서류 제출 이틀 남음',
      },
      {
        title: '소프트웨어공학 팀플 보고서',
        deadline: dateOffset(today, 9),
        completed: false,
        raw_input: '소프트웨어공학 팀플 보고서 다음주까지',
      },
    ])
    .select('*');
  if (taskError) throw new Error(`[seed] tasks 삽입 실패: ${taskError.message}`);
  console.log(`[seed] tasks ${tasks.length}건 삽입`);

  // ===== routines (2분할: 푸시업/스쿼트만 — 러닝은 뺐다) =====
  const { data: routines, error: routineError } = await client
    .from('routines')
    .insert([
      {
        title: '상체 운동',
        content: '푸시업 50 * 4',
        start_time: '20:00',
        end_time: '22:00',
        repeat_rule: '2split',
        raw_input: '상체 하체 번갈아 운동 20시부터 22시까지',
      },
      {
        title: '하체 운동',
        content: '스쿼트 50 * 4',
        start_time: '20:00',
        end_time: '22:00',
        repeat_rule: '2split',
        raw_input: '상체 하체 번갈아 운동 20시부터 22시까지',
      },
    ])
    .select('*');
  if (routineError) throw new Error(`[seed] routines 삽입 실패: ${routineError.message}`);
  console.log(`[seed] routines ${routines.length}건 삽입`);

  // ===== meals =====
  const { data: meals, error: mealError } = await client
    .from('meals')
    .insert([
      {
        date: dateOffset(today, 0),
        breakfast: '오트밀, 바나나',
        lunch: '잡곡밥, 닭가슴살, 브로콜리',
        dinner: '삶은 달걀 3개, 샐러드',
        raw_input:
          '오늘 아침은 오트밀에 바나나, 점심 잡곡밥 닭가슴살, 저녁은 삶은달걀 3개랑 샐러드',
      },
    ])
    .select('*');
  if (mealError) throw new Error(`[seed] meals 삽입 실패: ${mealError.message}`);
  console.log(`[seed] meals ${meals.length}건 삽입`);

  // ===== memos =====
  const { data: memos, error: memoError } = await client
    .from('memos')
    .insert([
      { content: '아이패드 케이스 새로 사기', raw_input: '아이패드 케이스 새로 사기' },
      { content: '여름방학 인턴십 지원 알아보기', raw_input: '여름방학 인턴십 지원 알아보기' },
    ])
    .select('*');
  if (memoError) throw new Error(`[seed] memos 삽입 실패: ${memoError.message}`);
  console.log(`[seed] memos ${memos.length}건 삽입`);

  // ===== routine_logs (하체 운동을 어제 완료 처리 → 오늘은 상체 day 차례) =====
  const lowerBodyRoutine = routines.find((r) => r.title === '하체 운동');
  if (lowerBodyRoutine) {
    const { error: logError } = await client.from('routine_logs').insert([
      {
        routine_id: lowerBodyRoutine.id,
        date: dateOffset(today, -1),
        completed: true,
        raw_input: '지난 운동 하체 day 완료',
      },
    ]);
    if (logError) throw new Error(`[seed] routine_logs 삽입 실패: ${logError.message}`);
    console.log('[seed] routine_logs 1건 삽입');
  }

  // ===== reminders (일정/과제 참조) =====
  const teamMeeting = schedules.find((s) => s.title === '팀플 회의');
  const contestTask = tasks.find((t) => t.title === '공모전 서류 제출');
  const reminderRows = [];
  if (teamMeeting) {
    reminderRows.push({
      target_type: 'schedule',
      target_id: teamMeeting.id,
      remind_at: `${dateOffset(today, 6)}T09:00:00+09:00`,
      raw_input: '다음주 화요일 오후 3시 팀플 회의, 전날 알려줘',
    });
  }
  if (contestTask) {
    reminderRows.push({
      target_type: 'task',
      target_id: contestTask.id,
      remind_at: `${dateOffset(today, 1)}T09:00:00+09:00`,
      raw_input: '공모전 서류 제출 전날 알려줘',
    });
  }
  if (reminderRows.length > 0) {
    const { error: reminderError } = await client.from('reminders').insert(reminderRows);
    if (reminderError) throw new Error(`[seed] reminders 삽입 실패: ${reminderError.message}`);
    console.log(`[seed] reminders ${reminderRows.length}건 삽입`);
  }
}

clearTables()
  .then(seed)
  .then(() => {
    console.log('[seed] 완료');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
