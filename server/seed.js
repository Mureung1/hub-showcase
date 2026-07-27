import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seedData() {
  console.log('Starting data reset...');

  // 1. Delete all posts (this should also cascade or we can just let it delete)
  console.log('Deleting all posts...');
  const { error: deletePostsError } = await supabaseAdmin.from('posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (deletePostsError) {
    console.error('Error deleting posts:', deletePostsError);
  }

  // Also delete chats and messages if any
  console.log('Deleting all chats and messages...');
  await supabaseAdmin.from('messages').delete().neq('id', '0');
  await supabaseAdmin.from('chats').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. Create 3 Dummy Users
  const dummyUsers = [
    { email: 'dummy1@jbnu.ac.kr', password: 'password123', username: '더미새내기', major: '컴퓨터공학과', grade: '1학년', gender: '남성' },
    { email: 'dummy2@jbnu.ac.kr', password: 'password123', username: '더미복학생', major: '경영학과', grade: '3학년', gender: '남성' },
    { email: 'dummy3@jbnu.ac.kr', password: 'password123', username: '더미졸업생', major: '디자인학과', grade: '4학년', gender: '여성' }
  ];

  console.log('Creating dummy users & profiles...');
  const createdProfiles = [];

  for (const user of dummyUsers) {
    // Check if user already exists
    const { data: existingProfiles } = await supabaseAdmin.from('profiles').select('*').eq('email', user.email);
    
    let userId;
    let username = user.username;
    let major = user.major;
    let grade = user.grade;

    if (existingProfiles && existingProfiles.length > 0) {
      userId = existingProfiles[0].id;
      username = existingProfiles[0].username;
      major = existingProfiles[0].major;
      grade = existingProfiles[0].grade;
      console.log(`User ${user.email} already exists in profiles. ID:`, userId);
    } else {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      });

      if (authError) {
        console.error('Error creating auth user:', authError.message);
        continue;
      }

      userId = authData.user.id;

      // Create profile
      const { error: profileError } = await supabaseAdmin.from('profiles').insert([{
        id: userId,
        email: user.email,
        username: user.username,
        email_verified: true
      }]);

      if (profileError) {
        console.error('Error creating profile:', profileError);
      } else {
        console.log(`Created user and profile for ${user.username}`);
      }
    }

    createdProfiles.push({ id: userId, username, major, grade });
  }

  // 3. Create 3 Dummy Posts
  console.log('Creating dummy posts...');
  
  if (createdProfiles.length === 3) {
    const dummyPosts = [
      {
        title: 'C언어 포인터 너무 어려워요 ㅠㅠ 도와주실 선배님!',
        content: '이번 학기 C언어 듣고 있는 새내기입니다. 포인터 개념이 도저히 이해가 안 가네요.. 중간고사 대비 멘토링 해주실 선배님 구합니다!! 기프티콘 쏩니다.',
        tags: ['1학년', '컴퓨터공학과', '학업고민', '프로그래밍'],
        reward: '기프티콘',
        author_grade: createdProfiles[0].grade,
        author_major: createdProfiles[0].major,
        author_id: createdProfiles[0].id,
        author_name: createdProfiles[0].username,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
      },
      {
        title: '경영학과 마케팅 공모전 팀원 1명 구합니다 (디자인 우대)',
        content: '다가오는 교내 마케팅 공모전 같이 나갈 팀원 한 분 모십니다. 현재 기획 2명이고요, PPT 템플릿 잘 만드시거나 시각디자인 능숙하신 분 환영합니다!',
        tags: ['3학년', '경영학과', '공모전', '팀원모집'],
        reward: '식사 제공',
        author_grade: createdProfiles[1].grade,
        author_major: createdProfiles[1].major,
        author_id: createdProfiles[1].id,
        author_name: createdProfiles[1].username,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      },
      {
        title: '4학년 취준생 멘탈 관리 어떻게 하시나요?',
        content: '졸업작품 하랴 취업 포트폴리오 준비하랴 너무 바쁘고 스트레스 받네요. 먼저 취업하신 선배님들이나 같은 처지인 4학년 분들, 멘탈 관리 팁 좀 공유해주세요.',
        tags: ['4학년', '디자인학과', '진로고민', '취업준비'],
        reward: '커피 한잔',
        author_grade: createdProfiles[2].grade,
        author_major: createdProfiles[2].major,
        author_id: createdProfiles[2].id,
        author_name: createdProfiles[2].username,
        created_at: new Date().toISOString()
      }
    ];

    const { error: insertPostsError } = await supabaseAdmin.from('posts').insert(dummyPosts);
    if (insertPostsError) {
      console.error('Error inserting dummy posts:', insertPostsError);
    } else {
      console.log('Successfully created 3 dummy posts!');
    }
  }

  console.log('Seed task completed!');
}

seedData();
