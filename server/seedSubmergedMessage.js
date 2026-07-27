// 데모용 1회성 스크립트 — 항상(웬만하면) 잠긴 상태로 보이는 메시지를 하나 심어둔다.
// valence/arousal을 극단값(새벽 감성)으로 고정해서, 현재 tide check와 거리가
// threshold(35)를 넘도록 만든다. 실행: node server/seedSubmergedMessage.js
import 'dotenv/config';
import { supabase } from './db/supabaseClient.js';

const DEMO_MESSAGE = {
  role: 'user',
  content: '요즘 계속 이런 생각이 드는데, 나만 그런 건가 싶어서…',
  valence: 12,
  arousal: 88,
};

const { data, error } = await supabase
  .from('messages')
  .insert(DEMO_MESSAGE)
  .select()
  .single();

if (error) {
  console.error('시드 실패:', error.message);
  process.exit(1);
}

console.log('데모 메시지 삽입 완료:', data);
