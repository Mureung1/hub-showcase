import { getSupabaseClient } from '../db/supabaseClient.js';

const loadSeedData = async () => {
  const supabase = getSupabaseClient();

  console.log('[Seed Data] 로드 시작...\n');

  try {
    // 1. 트렌드 키워드 로드
    console.log('📌 [Step 1/5] 트렌드 키워드 로드 중...');
    const trendKeywords = [
      { keyword: '#신메뉴', category: '음식', search_volume: 15000, platform: 'instagram' },
      { keyword: '#카페', category: '카페', search_volume: 25000, platform: 'instagram' },
      { keyword: '#디저트', category: '음식', search_volume: 18000, platform: 'tiktok' },
      { keyword: '#음식점', category: '음식', search_volume: 12000, platform: 'instagram' },
      { keyword: '#라떼', category: '음료', search_volume: 8500, platform: 'instagram' },
      { keyword: '#핸드드립', category: '카페', search_volume: 7200, platform: 'tiktok' },
      { keyword: '#겉바속촉', category: '음식', search_volume: 14500, platform: 'tiktok' },
      { keyword: '#빵지순례', category: '음식', search_volume: 11000, platform: 'instagram' }
    ];

    const { error: trendError } = await supabase
      .from('trend_keywords')
      .insert(trendKeywords);

    if (trendError && trendError.code !== 'PGRST204') {
      console.warn('⚠️  트렌드 키워드 로드 실패 (이미 존재할 수 있음):', trendError.message);
    } else {
      console.log('✅ 트렌드 키워드 로드 완료');
    }

    // 2. 가게 정보 로드
    console.log('\n📌 [Step 2/5] 샘플 가게 정보 로드 중...');
    const stores = [
      {
        store_name: '카페 에스프레소',
        category: '카페',
        location: '서울 강남구',
        signature_menu: '핸드드립 커피'
      },
      {
        store_name: '라면왕',
        category: '음식점',
        location: '서울 명동',
        signature_menu: '신라면'
      },
      {
        store_name: '디저트팜',
        category: '베이커리',
        location: '부산 해운대',
        signature_menu: '생크림 케이크'
      },
      {
        store_name: '오마카세 초밥',
        category: '일식당',
        location: '서울 강남구',
        signature_menu: '참치 대토로'
      }
    ];

    const { data: storeData, error: storeError } = await supabase
      .from('store_info')
      .insert(stores)
      .select();

    if (storeError && storeError.code !== 'PGRST204') {
      console.warn('⚠️  가게 정보 로드 실패:', storeError.message);
    } else {
      console.log(`✅ 샘플 가게 ${storeData?.length || 0}개 로드 완료`);
    }

    // 3. 생성 작업 로드
    console.log('\n📌 [Step 3/5] 생성 작업 기록 로드 중...');
    const generationJobs = [
      {
        store_id: 1,
        status: 'completed',
        result_video_url: '/ai-output/video_sample_001.mp4',
        metadata: JSON.stringify({
          purpose: '신메뉴 소개',
          mood: 'bright',
          trend: '#라떼'
        })
      },
      {
        store_id: 2,
        status: 'completed',
        result_video_url: '/ai-output/video_sample_002.mp4',
        metadata: JSON.stringify({
          purpose: '신메뉴 소개',
          mood: 'friendly',
          trend: '#라면'
        })
      },
      {
        store_id: 3,
        status: 'completed',
        result_video_url: '/ai-output/video_sample_003.mp4',
        metadata: JSON.stringify({
          purpose: '신메뉴 소개',
          mood: 'elegant',
          trend: '#디저트'
        })
      }
    ];

    const { data: jobData, error: jobError } = await supabase
      .from('generation_jobs')
      .insert(generationJobs)
      .select();

    if (jobError && jobError.code !== 'PGRST204') {
      console.warn('⚠️  생성 작업 로드 실패:', jobError.message);
    } else {
      console.log(`✅ 생성 작업 ${jobData?.length || 0}개 로드 완료`);
    }

    // 4. 발행 기록 로드
    console.log('\n📌 [Step 4/5] 발행 기록 로드 중...');
    const publishedVideos = [
      {
        video_id: 1,
        store_id: 1,
        platform: 'draft',
        title: '신 블루베리 라떼',
        hashtags: '#라떼 #신메뉴 #카페감성'
      },
      {
        video_id: 2,
        store_id: 1,
        platform: 'instagram',
        title: '핸드드립 커피 제조 과정',
        hashtags: '#핸드드립 #카페 #일상'
      },
      {
        video_id: 3,
        store_id: 2,
        platform: 'tiktok',
        title: '라면왕의 신 메뉴 공개',
        hashtags: '#라면 #신메뉴 #먹방'
      }
    ];

    const { data: pubData, error: pubError } = await supabase
      .from('published_videos')
      .insert(publishedVideos)
      .select();

    if (pubError && pubError.code !== 'PGRST204') {
      console.warn('⚠️  발행 기록 로드 실패:', pubError.message);
    } else {
      console.log(`✅ 발행 기록 ${pubData?.length || 0}개 로드 완료`);
    }

    console.log('\n✅ [완료] Seed 데이터 로드 성공!');
    console.log('\n📊 로드된 데이터:');
    console.log(`   - 트렌드 키워드: ${trendKeywords.length}개`);
    console.log(`   - 샘플 가게: ${storeData?.length || 0}개`);
    console.log(`   - 생성 작업: ${jobData?.length || 0}개`);
    console.log(`   - 발행 기록: ${pubData?.length || 0}개`);

  } catch (error) {
    console.error('❌ Seed 데이터 로드 중 오류 발생:', error);
    process.exit(1);
  }
};

loadSeedData();
