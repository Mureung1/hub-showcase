import { getSupabaseClient } from '../db/supabaseClient.js';
import { cropImageToVertical } from './cropService.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

    // Step 1: Sharp 엔트로피 기반 크롭
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
    console.error(`[❌ Pipeline 실패] job_id: ${jobId}`, error.message);
    console.error('[❌ Error Stack]', error.stack);

    // DB에 에러 즉시 업데이트
    try {
      await supabase
        .from('generation_jobs')
        .update({
          status: 'failed',
          error: error.message,
          error_message: error.message,
          failed_at: new Date().toISOString()
        })
        .eq('job_id', jobId);

      console.log(`[✅ DB 에러 업데이트 완료] job_id: ${jobId}`);
    } catch (dbError) {
      console.error(`[❌ DB 에러 업데이트 실패] job_id: ${jobId}`, dbError.message);
    }
  }
}

/**
 * Step 1: Sharp 스마트 크롭 (YOLOv8 대체)
 * Entropy 기반 중앙 크롭으로 1080x1920 (9:16) 형식 생성
 */
async function runStep1(jobId) {
  const supabase = getSupabaseClient();
  const startTime = Date.now();

  try {
    console.log('[Step 1] Sharp 엔트로피 기반 크롭 실행 중...');

    // 1. Job에서 이미지 URL 조회
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .select('original_image_url')
      .eq('job_id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job 정보를 찾을 수 없습니다');
    }

    let imagePath = job.original_image_url;

    // 로컬 경로를 절대경로로 변환
    if (!imagePath.startsWith('http')) {
      const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
      imagePath = path.resolve(__dirname, `../../${cleanPath}`);
    }

    console.log('[Step 1] 이미지 경로:', imagePath);
    console.log('[Step 1] 파일 존재:', fs.existsSync(imagePath));

    // 2. Sharp를 사용한 크롭 실행
    const outputDir = path.resolve(__dirname, '../../ai-pipeline/output');
    const result = await cropImageToVertical(imagePath, outputDir);

    if (result.status !== 'success') {
      throw new Error(result.message || 'Sharp 크롭 처리 실패');
    }

    console.log('[Step 1] Sharp 크롭 결과:', result);

    // 3. 크롭된 이미지 URL 처리
    const filename = path.basename(result.cropped_image_path);
    const croppedImageUrl = `/ai-output/${filename}`;

    console.log('[Step 1] 크롭 이미지 URL:', croppedImageUrl);

    // 4. DB 업데이트
    const duration = Date.now() - startTime;
    await supabase
      .from('generation_jobs')
      .update({
        step1_cropped_image_url: croppedImageUrl,
        step1_confidence: 0.95,  // Sharp는 신뢰도 개념이 없으므로 기본값
        step1_product_label: '중앙 크롭됨',
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

    console.log(`[✅ Step 1 완료] Sharp 엔트로피 크롭 (${duration}ms)\n`);

  } catch (error) {
    console.error('[❌ Step 1 실패]', error);
    throw error;
  }
}

/**
 * Step 2: Google Gemini API를 사용한 숏폼 자막 생성
 * 100% 무료 Google Gemini API(gemini-1.5-flash)로 트렌드에 맞는 자막 생성
 * (경량화: PyTorch/transformers 제거, OpenAI 비용 절감)
 */
async function runStep2(jobId) {
  const supabase = getSupabaseClient();
  const startTime = Date.now();

  try {
    console.log('[Step 2] Google Gemini API를 사용한 자막 생성 실행 중...');

    // 1. Job 정보 조회
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .select('trend_hashtag, step1_product_label, store_id, purpose, mood')
      .eq('job_id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job 정보를 찾을 수 없습니다');
    }

    // 가게 정보 조회
    const { data: store, error: storeError } = await supabase
      .from('store_info')
      .select('category, signature_menu')
      .eq('store_id', job.store_id)
      .single();

    const trendHashtag = job.trend_hashtag || '#유행해시태그';
    const productLabel = job.step1_product_label || '상품';
    const storeCategory = store?.category || '기본 카테고리';
    const signatureMenu = store?.signature_menu || '시그니처 메뉴';
    const purpose = job.purpose || '상품 홍보';
    const mood = job.mood || 'bright';

    // 2. Google Gemini API 호출
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다');
    }

    // Google Generative AI 클라이언트 초기화
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `당신은 소상공인을 위한 숏폼 콘텐츠 전문가입니다.

다음 정보를 바탕으로 15초 숏폼 영상을 위한 한국어 자막을 작성해주세요:
- 업체 카테고리: ${storeCategory}
- 대표 메뉴: ${signatureMenu}
- 상품/객체: ${productLabel}
- 트렌드 해시태그: ${trendHashtag}
- 영상 목적: ${purpose}
- 영상 분위기: ${mood}

요구사항:
1. 한국어로 작성 (이모지 포함 가능)
2. 15초 분량 (약 40-60글자)
3. 트렌드 해시태그를 자연스럽게 포함
4. 행동 촉구 포함 (클릭, 방문, 주문 등)
5. SNS 친화적이고 감정적 호소력 있게

다음 JSON 형식으로 응답해주세요 (마크다운 코드 블록 없이, 순수 JSON만):
{
  "primary_caption": "메인 자막",
  "caption_options": [
    {"text": "옵션1", "similarity": 0.95},
    {"text": "옵션2", "similarity": 0.90},
    {"text": "옵션3", "similarity": 0.85}
  ],
  "hashtags": "#해시태그1 #해시태그2 #해시태그3",
  "similarity_score": 0.92
}`;

    console.log('[Step 2] Gemini 요청:', {
      model: 'gemini-1.5-flash',
      promptLength: prompt.length,
      inputs: { trendHashtag, productLabel, storeCategory, mood }
    });

    // Gemini API 호출
    const response = await model.generateContent(prompt);
    const content = response.response.text();

    if (!content) {
      throw new Error('Gemini API에서 응답 콘텐츠가 없습니다');
    }

    console.log('[Step 2] Gemini 원본 응답:', content.substring(0, 200) + '...');

    // JSON 파싱 (마크다운 코드 블록 제거)
    let jsonText = content;
    if (content.includes('```json')) {
      jsonText = content.split('```json')[1]?.split('```')[0] || content;
    } else if (content.includes('```')) {
      jsonText = content.split('```')[1] || content;
    }
    jsonText = jsonText.trim();

    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[Step 2] JSON 파싱 실패:', jsonText);
      throw new Error(`Gemini 응답 파싱 실패: ${parseError.message}`);
    }

    console.log('[Step 2] Gemini 생성 결과:', result);

    // 3. DB 업데이트
    const duration = Date.now() - startTime;
    const captionOptions = result.caption_options || [];

    console.log(`[Step 2] 생성된 자막 옵션: ${captionOptions.length}개`);
    captionOptions.forEach((opt, i) => {
      console.log(`  ${i+1}. [유사도: ${opt.similarity}] ${opt.text}`);
    });

    // DB 업데이트 (정상 응답)
    await updateStep2Results(jobId, result, duration);

    console.log(`[✅ Step 2 완료] Gemini 자막 생성 (${duration}ms)\n`);

  } catch (error) {
    console.error('[❌ Step 2 실패]', error.message);
    console.error('[Error Stack]', error.stack);

    // Gemini API 실패 시 Fallback 대사 사용
    console.log('[⚠️  Fallback] Gemini API 호출 실패 - 기본 대사 템플릿 사용');
    const fallbackResult = generateFallbackCaption(storeCategory, signatureMenu);
    const duration = Date.now() - startTime;

    try {
      await updateStep2Results(jobId, fallbackResult, duration, true);
      console.log(`[✅ Step 2 Fallback] 기본 대사로 진행 (${duration}ms)\n`);
    } catch (dbError) {
      console.error('[❌ Step 2 DB 업데이트 실패]', dbError.message);
      throw new Error(`Step 2 처리 중 오류 발생: ${error.message}`);
    }
  }
}

/**
 * Step 2 DB 업데이트 헬퍼 함수
 */
async function updateStep2Results(jobId, result, duration, isFallback = false) {
  const supabase = getSupabaseClient();
  const captionOptions = result.caption_options || [];

  if (!isFallback) {
    console.log(`[Step 2] 생성된 자막 옵션: ${captionOptions.length}개`);
    captionOptions.forEach((opt, i) => {
      console.log(`  ${i+1}. [유사도: ${opt.similarity}] ${opt.text}`);
    });
  }

  await supabase
    .from('generation_jobs')
    .update({
      step2_caption: result.primary_caption,
      step2_caption_options: JSON.stringify(captionOptions),
      step2_hashtags: result.hashtags,
      step2_similarity_score: result.similarity_score || 0.70,
      progress: 50,
      current_step: 2
    })
    .eq('job_id', jobId);

  await supabase
    .from('generation_steps')
    .update({
      status: isFallback ? 'completed_fallback' : 'completed',
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      notes: isFallback ? 'Gemini API 실패 - 기본 대사 사용' : null
    })
    .eq('job_id', jobId)
    .eq('step_number', 2);
}

/**
 * Gemini API 실패 시 Fallback 대사 생성
 */
function generateFallbackCaption(storeCategory, signatureMenu) {
  const fallbackCaptions = {
    '카페': '☕ 이 커피를 놓치지 마세요! 지금 방문해보세요 👉',
    '음식점': '🍜 맛있는 맛집! 꼭 와서 먹어봐야 해요 👉',
    '한식': '🥢 우리 한식의 참맛! 지금 주문하세요 👉',
    '양식': '🍝 정성 가득한 양식! 오늘 저녁은 여기로 👉',
    '중식': '🥡 대박 맛! 이 맛 어디서 먹어봤어? 👉',
    '카테고리': `✨ ${signatureMenu || '시그니처 메뉴'}를 지금 즐겨보세요! 👉`,
  };

  const primaryCaption = fallbackCaptions[storeCategory] || fallbackCaptions['카테고리'];

  return {
    primary_caption: primaryCaption,
    caption_options: [
      { text: '지금 바로 방문해보세요! 🎉', similarity: 0.75 },
      { text: '이 맛을 놓칠 수 없어요! 💯', similarity: 0.70 },
      { text: '최고의 선택! 추천합니다 ⭐', similarity: 0.68 }
    ],
    hashtags: '#맛집 #추천 #꼭와봐야해',
    similarity_score: 0.70
  };
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
      const pythonScriptPath = path.resolve(__dirname, '../../ai-pipeline/tts_generate.py');
      console.log('[Step 3] TTS 스크립트 경로:', pythonScriptPath);
      console.log('[Step 3] 입력값 - 자막:', caption);

      const { stdout, stderr } = await execFileAsync('python', [
        pythonScriptPath,
        caption,
        'ko'
      ]);

      if (stderr) {
        console.log('[Step 3] Python stderr:', stderr);
      }

      result = JSON.parse(stdout);
      console.log('[Step 3] TTS 결과:', result);
    } catch (pythonError) {
      console.error('[Step 3] TTS 실행 에러:', {
        message: pythonError.message,
        stderr: pythonError.stderr,
        stdout: pythonError.stdout,
        code: pythonError.code
      });
      throw new Error(`TTS 실행 실패: ${pythonError.message}`);
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
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const path = await import('path');
    const execFileAsync = promisify(execFile);
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

    // 2. FFmpeg 향상된 스크립트 실행 (Ken Burns + 자막 애니메이션)
    let result;
    try {
      const pythonScriptPath = path.resolve(__dirname, '../../ai-pipeline/ffmpeg_render_enhanced.py');
      console.log('[Step 4] FFmpeg 향상된 렌더러 사용:', pythonScriptPath);
      console.log('[Step 4] 입력값:', {
        imageUrl: imageUrl || 'null',
        audioUrl: audioUrl || 'null',
        caption,
        effects: ['ken_burns_zoom', 'subtitle_fade_animation']
      });

      const { stdout, stderr } = await execFileAsync('python', [
        pythonScriptPath,
        imageUrl || '',
        audioUrl || '',
        caption || '',
        JSON.stringify(hashtags || [])
      ]);

      if (stderr) {
        console.log('[Step 4] Python stderr:', stderr);
      }

      result = JSON.parse(stdout);
      console.log('[Step 4] FFmpeg 결과:', result);
    } catch (pythonError) {
      console.error('[Step 4] FFmpeg 실행 에러:', {
        message: pythonError.message,
        stderr: pythonError.stderr,
        stdout: pythonError.stdout,
        code: pythonError.code
      });
      throw new Error(`FFmpeg 실행 실패: ${pythonError.message}`);
    }

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
