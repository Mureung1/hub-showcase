import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
let isMock = false;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase_') || supabaseKey.includes('your_supabase_') || supabaseKey === '') {
  console.warn('⚠️ WARNING: Supabase URL or Anon Key is missing or empty.');
  console.warn('⚠️ Falling back to In-Memory Mock Database mode.');
  isMock = true;
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase Client initialized successfully with URL:', supabaseUrl);
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err.message);
    console.warn('⚠️ Falling back to In-Memory Mock Database mode.');
    isMock = true;
  }
}

// Simple in-memory mock database state
const mockDb = {
  chat_requests: [],
  posts: [
    {
      id: '1',
      title: '학교 프로그램 정보나 새내기 생활 팁 알려주실 선배님 찾아요!',
      content: '컴공과 1학년인데 학과 생활이 막막해서 조언을 듣고 싶어요. 대외활동이나 공모전 정보도 알려주시면 감사하겠습니다.',
      tags: ['1학년', '컴퓨터공학과', '학교생활'],
      reward: '음료제공',
      author_grade: '1학년',
      author_major: '컴퓨터공학과',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString() // 3 hours ago
    },
    {
      id: '2',
      title: '동아리 추천 해주실 분 계신가요?',
      content: '이번 학기에 밴드 동아리나 운동 동아리 들어가고 싶은데 추천 부탁드립니다.',
      tags: ['고민상담', '동아리추천'],
      reward: '없음',
      author_grade: '2학년',
      author_major: '경영학과',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString() // 1 day ago
    }
  ],
  chats: [],
  messages: [],
  profiles: []
};

export { supabase, isMock, mockDb };
