import { getSupabaseClient } from '../db/supabaseClient.js';

/**
 * AI 파이프라인 오케스트레이션
 * Step 1: YOLOv8 스마트 크롭
 * Step 2: KoBERT 트렌드 매칭
 * Step 3: TTS 음성 생성
 * Step 4: FFmpeg 영상 렌더링
 */
export async function runPipeline(jobId) {
  const supabase = getSupabaseClient();

  try {
    console.log(`\n[Pipeline 시작] job_id: ${jobId}\n`);

    // Step 1: YOLOv8
    await runStep1(jobId);

    // Step 2: KoBERT
    await runStep2(jobId);

    // Step 3: TTS
    await runStep3(jobId);

    // Step 4: FFmpeg
    await runStep4(jobId);

    // 모든 단계 완료
    await supabase
      .from('generation_jobs')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString()
      })
      .eq('job_id', jobId);

    console.log(`[✅ Pipeline 완료] job_id: ${jobId}\n`);

  } catch (error) {
    console.error(`[❌ Pipeline 실패] job_id: ${jobId}`, error);

    await supabase
      .from('generation_jobs')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('job_id', jobId);
  }
}

/**
 * Step 1: YOLOv8 스마트 크롭
 * 상품 영역 자동 감지 및 크롭
 */
async function runStep1(jobId) {
  const supabase = getSupabaseClient();

  try {
    console.log('[Step 1] YOLOv8 스마트 크롭 실행 중...');

    // TODO: 나중에 실제 YOLOv8 코드로 교체
    // const croppedImage = await detectAndCrop(imageUrl);

    // 임시: 3초 대기 (Mock)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // DB 업데이트
    await supabase
      .from('generation_jobs')
      .update({
        step1_cropped_image_url: 'https://mock.example.com/cropped.png',
        step1_confidence: 0.95,
        step1_product_label: '테스트 상품',
        progress: 25,
        current_step: 1
      })
      .eq('job_id', jobId);

    await supabase
      .from('generation_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: 3000
      })
      .eq('job_id', jobId)
      .eq('step_number', 1);

    console.log('[✅ Step 1 완료] YOLOv8 스마트 크롭\n');

  } catch (error) {
    console.error('[❌ Step 1 실패]', error);
    throw error;
  }
}

/**
 * Step 2: KoBERT 트렌드 매칭
 * 트렌드 해시태그와 상품 정보를 분석하여 최적화된 자막 생성
 */
async function runStep2(jobId) {
  const supabase = getSupabaseClient();

  try {
    console.log('[Step 2] KoBERT 트렌드 매칭 실행 중...');

    // TODO: 나중에 실제 KoBERT 코드로 교체
    // const caption = await generateCaption(trendHashtag, productLabel);

    // 임시: 2초 대기 (Mock)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // DB 업데이트
    await supabase
      .from('generation_jobs')
      .update({
        step2_caption: '✨ 테스트용 자막입니다! 🎉',
        step2_hashtags: ['#테스트', '#데모'],
        step2_similarity_score: 0.87,
        progress: 50,
        current_step: 2
      })
      .eq('job_id', jobId);

    await supabase
      .from('generation_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: 2000
      })
      .eq('job_id', jobId)
      .eq('step_number', 2);

    console.log('[✅ Step 2 완료] KoBERT 트렌드 매칭\n');

  } catch (error) {
    console.error('[❌ Step 2 실패]', error);
    throw error;
  }
}

/**
 * Step 3: TTS 음성 생성
 * 자막 텍스트를 한국어 음성으로 변환
 */
async function runStep3(jobId) {
  const supabase = getSupabaseClient();

  try {
    console.log('[Step 3] TTS 음성 생성 실행 중...');

    // TODO: 나중에 실제 Google Cloud TTS 코드로 교체
    // const audioUrl = await generateVoice(caption);

    // 임시: 2초 대기 (Mock)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // DB 업데이트
    await supabase
      .from('generation_jobs')
      .update({
        step3_audio_url: 'https://mock.example.com/audio.mp3',
        progress: 75,
        current_step: 3
      })
      .eq('job_id', jobId);

    await supabase
      .from('generation_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: 2000
      })
      .eq('job_id', jobId)
      .eq('step_number', 3);

    console.log('[✅ Step 3 완료] TTS 음성 생성\n');

  } catch (error) {
    console.error('[❌ Step 3 실패]', error);
    throw error;
  }
}

/**
 * Step 4: FFmpeg 영상 렌더링
 * 이미지 + 음성 + 자막을 조합하여 최종 15초 MP4 생성
 */
async function runStep4(jobId) {
  const supabase = getSupabaseClient();

  try {
    console.log('[Step 4] FFmpeg 영상 렌더링 실행 중...');

    // TODO: 나중에 실제 FFmpeg 코드로 교체
    // const videoUrl = await renderVideo(imageUrl, audioUrl, caption);

    // 임시: 8초 대기 (Mock)
    await new Promise(resolve => setTimeout(resolve, 8000));

    // DB 업데이트
    await supabase
      .from('generation_jobs')
      .update({
        step4_video_url: 'https://mock.example.com/video.mp4',
        step4_thumbnail_url: 'https://mock.example.com/thumbnail.jpg',
        progress: 100,
        current_step: 4
      })
      .eq('job_id', jobId);

    await supabase
      .from('generation_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: 8000
      })
      .eq('job_id', jobId)
      .eq('step_number', 4);

    console.log('[✅ Step 4 완료] FFmpeg 영상 렌더링\n');

  } catch (error) {
    console.error('[❌ Step 4 실패]', error);
    throw error;
  }
}

export default runPipeline;
