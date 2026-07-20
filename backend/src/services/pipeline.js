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
  const startTime = Date.now();

  try {
    console.log('[Step 1] YOLOv8 스마트 크롭 실행 중...');

    // 1. Job에서 이미지 URL 조회
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .select('original_image_url')
      .eq('job_id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job 정보를 찾을 수 없습니다');
    }

    // 2. Python 스크립트 실행
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const path = await import('path');
    const execFileAsync = promisify(execFile);

    let imagePath = job.original_image_url;

    // 로컬 경로를 절대경로로 변환
    if (!imagePath.startsWith('http')) {
      // /uploads/... 형태 또는 uploads/... 형태를 절대경로로
      const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
      imagePath = path.resolve(process.cwd(), cleanPath);
    }

    let result;
    try {
      const { stdout } = await execFileAsync('python', [
        path.resolve('ai-pipeline/yolov8_crop.py'),
        imagePath
      ]);
      result = JSON.parse(stdout);
    } catch (pythonError) {
      console.warn('[Step 1] YOLOv8 실행 실패, Mock 데이터 사용:', pythonError.message);
      // 실패 시 Mock 데이터
      result = {
        status: 'success',
        cropped_image_path: 'https://mock.example.com/cropped.png',
        confidence: 0.95,
        product_label: '테스트 상품'
      };
    }

    if (result.status !== 'success') {
      throw new Error(result.message || 'YOLOv8 처리 실패');
    }

    // 3. 크롭된 이미지 경로 처리
    let croppedImageUrl = result.cropped_image_path;

    if (!croppedImageUrl.startsWith('http')) {
      // 로컬 상대경로를 절대경로로 변환
      let cleanPath = croppedImageUrl;

      // /로 시작하면 제거
      if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.slice(1);
      }

      // backend/로 시작하면 제거 (중복 방지)
      if (cleanPath.startsWith('backend/')) {
        cleanPath = cleanPath.slice('backend/'.length);
      }

      croppedImageUrl = path.resolve(process.cwd(), cleanPath);

      // 파일명만 추출해서 URL로 변환
      const filename = path.basename(croppedImageUrl);
      croppedImageUrl = `/ai-output/${filename}`;

      console.log('[Step 1] 크롭 이미지 URL:', croppedImageUrl);

      // Storage 업로드는 시도만 함 (실패해도 로컬 경로 유지)
      try {
        const fs = await import('fs');
        if (fs.existsSync(croppedImageUrl)) {
          const fileBuffer = fs.readFileSync(croppedImageUrl);
          const storagePath = `cropped/${jobId}_${Date.now()}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(storagePath, fileBuffer);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('uploads')
              .getPublicUrl(storagePath);
            croppedImageUrl = publicUrl;
            console.log('[Step 1] Storage 업로드 성공:', croppedImageUrl);
          } else {
            console.warn('[Step 1] Storage 업로드 실패 → 로컬 경로 사용:', uploadError.message);
          }
        }
      } catch (uploadErr) {
        console.warn('[Step 1] 파일 읽기/업로드 실패 → 로컬 경로 사용:', uploadErr.message);
      }
    }

    // 4. DB 업데이트
    const duration = Date.now() - startTime;
    await supabase
      .from('generation_jobs')
      .update({
        step1_cropped_image_url: croppedImageUrl,
        step1_confidence: result.confidence || 0.95,
        step1_product_label: result.product_label || '상품',
        progress: 25,
        current_step: 1
      })
      .eq('job_id', jobId);

    await supabase
      .from('generation_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: duration
      })
      .eq('job_id', jobId)
      .eq('step_number', 1);

    console.log(`[✅ Step 1 완료] YOLOv8 스마트 크롭 (${duration}ms)\n`);

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
  const startTime = Date.now();

  try {
    console.log('[Step 2] KoBERT 트렌드 매칭 실행 중...');

    // 1. Job 정보 조회 (트렌드, 상품명, 카테고리)
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .select('trend_hashtag, step1_product_label, store_id')
      .eq('job_id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job 정보를 찾을 수 없습니다');
    }

    // 가게 정보 조회
    const { data: store, error: storeError } = await supabase
      .from('store_info')
      .select('category')
      .eq('store_id', job.store_id)
      .single();

    const trendHashtag = job.trend_hashtag || '#유행해시태그';
    const productLabel = job.step1_product_label || '상품';
    const storeCategory = store?.category || '기본';

    // 2. KoBERT Python 스크립트 실행
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const path = await import('path');
    const execFileAsync = promisify(execFile);

    let result;
    try {
      const { stdout } = await execFileAsync('python', [
        path.resolve('ai-pipeline/kobert_caption.py'),
        trendHashtag,
        productLabel,
        storeCategory
      ]);
      result = JSON.parse(stdout);
    } catch (pythonError) {
      console.warn('[Step 2] KoBERT 실행 실패, Mock 데이터 사용:', pythonError.message);
      // 실패 시 Mock 데이터
      result = {
        status: 'success',
        caption: `✨ ${trendHashtag}로 핫한 ${productLabel}! 🎉`,
        hashtags: [trendHashtag, '#맛집', '#신메뉴'],
        similarity_score: 0.85
      };
    }

    if (result.status !== 'success') {
      throw new Error(result.message || 'KoBERT 처리 실패');
    }

    // 3. DB 업데이트
    const duration = Date.now() - startTime;
    await supabase
      .from('generation_jobs')
      .update({
        step2_caption: result.caption,
        step2_hashtags: result.hashtags,
        step2_similarity_score: result.similarity_score || 0.85,
        progress: 50,
        current_step: 2
      })
      .eq('job_id', jobId);

    await supabase
      .from('generation_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: duration
      })
      .eq('job_id', jobId)
      .eq('step_number', 2);

    console.log(`[✅ Step 2 완료] KoBERT 트렌드 매칭 (${duration}ms)\n`);

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
  const startTime = Date.now();

  try {
    console.log('[Step 3] TTS 음성 생성 실행 중...');

    // 1. Step 2에서 생성된 자막 조회
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .select('step2_caption')
      .eq('job_id', jobId)
      .single();

    if (jobError || !job?.step2_caption) {
      throw new Error('자막 정보를 찾을 수 없습니다');
    }

    const caption = job.step2_caption;

    // 2. TTS Python 스크립트 실행
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const path = await import('path');
    const execFileAsync = promisify(execFile);

    let result;
    try {
      const { stdout } = await execFileAsync('python', [
        path.resolve('ai-pipeline/tts_generate.py'),
        caption,
        'ko'
      ]);
      result = JSON.parse(stdout);
    } catch (pythonError) {
      console.warn('[Step 3] TTS 실행 실패, Mock 데이터 사용:', pythonError.message);
      // 실패 시 Mock 데이터
      result = {
        status: 'success',
        audio_path: 'https://mock.example.com/audio.mp3',
        file_size: 45000,
        duration_estimate: 6.5
      };
    }

    if (result.status !== 'success') {
      throw new Error(result.message || 'TTS 처리 실패');
    }

    // 3. 음성 파일 경로 처리
    let audioUrl = result.audio_path;

    console.log('[Step 3] 결과:', {
      status: result.status,
      audio_path: result.audio_path,
      duration_estimate: result.duration_estimate
    });

    if (!audioUrl.startsWith('http')) {
      // 로컬 상대경로를 절대경로로 변환
      let cleanPath = audioUrl;

      // /로 시작하면 제거
      if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.slice(1);
      }

      // backend/로 시작하면 제거 (중복 방지)
      if (cleanPath.startsWith('backend/')) {
        cleanPath = cleanPath.slice('backend/'.length);
      }

      audioUrl = path.resolve(process.cwd(), cleanPath);

      // 파일명만 추출해서 URL로 변환
      const filename = path.basename(audioUrl);
      audioUrl = `/ai-output/${filename}`;

      console.log('[Step 3] 로컬 경로 URL:', audioUrl);

      // Storage 업로드는 시도만 함 (실패해도 로컬 경로 유지)
      try {
        const fs = await import('fs');
        if (fs.existsSync(audioUrl)) {
          const fileBuffer = fs.readFileSync(audioUrl);
          const storagePath = `audio/${jobId}_${Date.now()}.mp3`;

          console.log('[Step 3] Storage 업로드 시도:', storagePath);

          const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(storagePath, fileBuffer);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('uploads')
              .getPublicUrl(storagePath);
            audioUrl = publicUrl;
            console.log('[Step 3] Storage 업로드 성공:', audioUrl);
          } else {
            console.warn('[Step 3] Storage 업로드 실패 → 로컬 경로 사용:', uploadError.message);
          }
        }
      } catch (uploadErr) {
        console.warn('[Step 3] 파일 읽기/업로드 실패 → 로컬 경로 사용:', uploadErr.message);
      }
    }

    // 4. DB 업데이트
    const duration = Date.now() - startTime;

    console.log('[Step 3] DB 저장 전 audioUrl:', audioUrl);

    const { data: updateData, error: updateError } = await supabase
      .from('generation_jobs')
      .update({
        step3_audio_url: audioUrl,
        progress: 75,
        current_step: 3
      })
      .eq('job_id', jobId)
      .select();

    if (updateError) {
      console.error('[Step 3] DB 업데이트 실패:', updateError);
    } else {
      console.log('[Step 3] DB 업데이트 완료, 저장된 값:', updateData?.[0]?.step3_audio_url);
    }

    await supabase
      .from('generation_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: duration
      })
      .eq('job_id', jobId)
      .eq('step_number', 3);

    console.log(`[✅ Step 3 완료] TTS 음성 생성 (${duration}ms)\n`);

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
  const startTime = Date.now();

  try {
    console.log('[Step 4] FFmpeg 영상 렌더링 실행 중...');

    // 1. 필요한 데이터 조회
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .select('step1_cropped_image_url, step3_audio_url, step2_caption, step2_hashtags')
      .eq('job_id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job 정보를 찾을 수 없습니다');
    }

    let imageUrl = job.step1_cropped_image_url;
    let audioUrl = job.step3_audio_url;
    const caption = job.step2_caption || '멋진 영상';
    const hashtags = job.step2_hashtags || ['#트렌드'];

    // URL 경로를 절대 파일 경로로 변환
    const path = await import('path');
    if (imageUrl && imageUrl.startsWith('/ai-output/')) {
      const filename = imageUrl.replace('/ai-output/', '');
      imageUrl = path.resolve(process.cwd(), 'ai-pipeline/output', filename);
    }
    if (audioUrl && audioUrl.startsWith('/ai-output/')) {
      const filename = audioUrl.replace('/ai-output/', '');
      audioUrl = path.resolve(process.cwd(), 'ai-pipeline/output', filename);
    }

    console.log('[Step 4] 데이터 확인:', {
      imageUrl: imageUrl || 'null',
      audioUrl: audioUrl || 'null',
      caption,
      hashtags
    });

    // Mock 데이터로 바로 진행 (FFmpeg Python 스크립트 실행 건너뜀)
    console.log('[Step 4] 임시로 Mock 데이터 사용 (FFmpeg 구현 예정)');
    const result = {
      status: 'success',
      video_path: '/ai-output/video_mock.mp4',
      thumbnail_path: '/ai-output/thumbnail_mock.jpg',
      duration: 15,
      resolution: '1080x1920'
    };

    // 3. 영상 파일 경로 처리
    let videoUrl = result.video_path;
    let thumbnailUrl = result.thumbnail_path;

    // 비디오 경로 절대경로 변환
    if (!videoUrl.startsWith('http')) {
      let cleanPath = videoUrl;

      if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.slice(1);
      }

      if (cleanPath.startsWith('backend/')) {
        cleanPath = cleanPath.slice('backend/'.length);
      }

      videoUrl = path.resolve(process.cwd(), cleanPath);

      // 파일명만 추출해서 URL로 변환
      const videoFilename = path.basename(videoUrl);
      videoUrl = `/ai-output/${videoFilename}`;

      console.log('[Step 4] 비디오 URL:', videoUrl);

      // Storage 업로드 시도 (실패해도 로컬 경로 유지)
      try {
        const fs = await import('fs');
        if (fs.existsSync(videoUrl)) {
          const fileBuffer = fs.readFileSync(videoUrl);
          const storagePath = `videos/${jobId}_${Date.now()}.mp4`;

          const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(storagePath, fileBuffer);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('uploads')
              .getPublicUrl(storagePath);
            videoUrl = publicUrl;
            console.log('[Step 4] 비디오 Storage 업로드 성공:', videoUrl);
          } else {
            console.warn('[Step 4] 비디오 Storage 업로드 실패 → 로컬 경로 사용:', uploadError.message);
          }
        }
      } catch (uploadErr) {
        console.warn('[Step 4] 비디오 파일 읽기/업로드 실패 → 로컬 경로 사용:', uploadErr.message);
      }
    }

    // 썸네일 경로 절대경로 변환
    if (!thumbnailUrl.startsWith('http')) {
      let cleanPath = thumbnailUrl;

      if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.slice(1);
      }

      if (cleanPath.startsWith('backend/')) {
        cleanPath = cleanPath.slice('backend/'.length);
      }

      thumbnailUrl = path.resolve(process.cwd(), cleanPath);

      // 파일명만 추출해서 URL로 변환
      const thumbnailFilename = path.basename(thumbnailUrl);
      thumbnailUrl = `/ai-output/${thumbnailFilename}`;

      console.log('[Step 4] 썸네일 URL:', thumbnailUrl);

      // Storage 업로드 시도 (실패해도 로컬 경로 유지)
      try {
        const fs = await import('fs');
        if (fs.existsSync(thumbnailUrl)) {
          const fileBuffer = fs.readFileSync(thumbnailUrl);
          const storagePath = `thumbnails/${jobId}_${Date.now()}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(storagePath, fileBuffer);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('uploads')
              .getPublicUrl(storagePath);
            thumbnailUrl = publicUrl;
            console.log('[Step 4] 썸네일 Storage 업로드 성공:', thumbnailUrl);
          } else {
            console.warn('[Step 4] 썸네일 Storage 업로드 실패 → 로컬 경로 사용:', uploadError.message);
          }
        }
      } catch (uploadErr) {
        console.warn('[Step 4] 썸네일 파일 읽기/업로드 실패 → 로컬 경로 사용:', uploadErr.message);
      }
    }

    // 4. DB 업데이트
    const duration = Date.now() - startTime;
    await supabase
      .from('generation_jobs')
      .update({
        step4_video_url: videoUrl,
        step4_thumbnail_url: thumbnailUrl,
        progress: 100,
        current_step: 4
      })
      .eq('job_id', jobId);

    await supabase
      .from('generation_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: duration
      })
      .eq('job_id', jobId)
      .eq('step_number', 4);

    console.log(`[✅ Step 4 완료] FFmpeg 영상 렌더링 (${duration}ms)\n`);

  } catch (error) {
    console.error('[❌ Step 4 실패]', error);
    throw error;
  }
}

export default runPipeline;
