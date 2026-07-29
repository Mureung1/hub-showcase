import { getSupabaseClient } from "../db/supabaseClient.js";
import { cropImageToVertical } from "./cropService.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * AI 파이프라인 오케스트레이션
 */
export async function runPipeline(jobId) {
  const supabase = getSupabaseClient();

  try {
    console.log(`\n[Pipeline 시작] job_id: ${jobId}\n`);

    await runStep1(jobId);
    await runStep2(jobId);
    await runStep3(jobId);
    await runStep4(jobId);

    // 모든 단계 완료
    await supabase
      .from("generation_jobs")
      .update({
        status: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq("job_id", jobId);

    console.log(`[✅ Pipeline 완료] job_id: ${jobId}\n`);
  } catch (error) {
    console.error(`[❌ Pipeline 실패] job_id: ${jobId}`, error.message);
    console.error("[❌ Error Stack]", error.stack);

    try {
      await supabase
        .from("generation_jobs")
        .update({
          status: "failed",
          error: error.message,
          error_message: error.message,
          failed_at: new Date().toISOString(),
        })
        .eq("job_id", jobId);

      console.log(`[✅ DB 에러 업데이트 완료] job_id: ${jobId}`);
    } catch (dbError) {
      console.error(
        `[❌ DB 에러 업데이트 실패] job_id: ${jobId}`,
        dbError.message,
      );
    }
  }
}

/**
 * Step 1: Sharp 스마트 크롭
 */
async function runStep1(jobId) {
  const supabase = getSupabaseClient();
  const startTime = Date.now();

  try {
    console.log(`[Step 1] Sharp 엔트로피 기반 크롭 실행 중... (job_id: ${jobId})`);

    const { data: job, error: jobError } = await supabase
      .from("generation_jobs")
      .select("original_image_url")
      .eq("job_id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error("Job 정보를 찾을 수 없습니다");
    }

    let imagePath = job.original_image_url;

    console.log("[Step 1] 원본 이미지 URL:", imagePath);

    // HTTP URL이면 다운로드, 로컬 경로면 절대경로로 변환
    if (imagePath.startsWith("http")) {
      // Supabase Storage URL 다운로드
      console.log("[Step 1] HTTP URL 감지 - 다운로드 중:", imagePath);
      try {
        const downloadDir = path.resolve(__dirname, "../../ai-pipeline/download");
        if (!fs.existsSync(downloadDir)) {
          fs.mkdirSync(downloadDir, { recursive: true });
        }

        const tempPath = path.join(downloadDir, `temp_${Date.now()}.jpg`);
        const response = await fetch(imagePath);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(tempPath, buffer);

        imagePath = tempPath;
        console.log("[Step 1] HTTP URL 다운로드 완료:", imagePath);
      } catch (downloadErr) {
        throw new Error(`Storage URL 다운로드 실패: ${downloadErr.message}`);
      }
    } else {
      // 로컬 경로인 경우 절대경로로 변환
      const cleanPath = imagePath.startsWith("/")
        ? imagePath.slice(1)
        : imagePath;
      imagePath = path.resolve(__dirname, `../../${cleanPath}`);
      console.log("[Step 1] 로컬 이미지 경로:", imagePath);
      console.log("[Step 1] 파일 존재:", fs.existsSync(imagePath));
    }

    const outputDir = path.resolve(__dirname, "../../ai-pipeline/output");
    const result = await cropImageToVertical(imagePath, outputDir);

    if (result.status !== "success") {
      throw new Error(result.message || "Sharp 크롭 처리 실패");
    }

    console.log("[Step 1] Sharp 크롭 결과:", result);

    const filename = path.basename(result.cropped_image_path);
    const croppedImageUrl = `/ai-output/${filename}`;

    console.log("[Step 1] 크롭 이미지 URL:", croppedImageUrl);

    const duration = Date.now() - startTime;
    await supabase
      .from("generation_jobs")
      .update({
        step1_cropped_image_url: croppedImageUrl,
        step1_confidence: 0.95,
        step1_product_label: "중앙 크롭됨",
        progress: 25,
        current_step: 1,
      })
      .eq("job_id", jobId);

    await supabase
      .from("generation_steps")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_ms: duration,
      })
      .eq("job_id", jobId)
      .eq("step_number", 1);

    console.log(`[✅ Step 1 완료] Sharp 엔트로피 크롭 (${duration}ms)\n`);
  } catch (error) {
    console.error("[❌ Step 1 실패]", error);
    throw error;
  }
}

/**
 * Step 2: Google Gemini API를 사용한 자막 생성
 */
async function runStep2(jobId) {
  const supabase = getSupabaseClient();
  const startTime = Date.now();

  let storeCategory = "음식점";
  let signatureMenu = "시그니처 메뉴";

  try {
    console.log(`[Step 2] Google Gemini API를 사용한 자막 생성 실행 중... (job_id: ${jobId})`);

    const { data: job, error: jobError } = await supabase
      .from("generation_jobs")
      .select("trend_hashtag, step1_product_label, store_id, purpose, mood")
      .eq("job_id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error("Job 정보를 찾을 수 없습니다");
    }

    const { data: store } = await supabase
      .from("store_info")
      .select("category, signature_menu")
      .eq("store_id", job.store_id)
      .single();

    const trendHashtag = job.trend_hashtag || "#유행해시태그";
    const productLabel = job.step1_product_label || "상품";
    storeCategory = store?.category || "기본 카테고리";
    signatureMenu = store?.signature_menu || "시그니처 메뉴";
    const purpose = job.purpose || "상품 홍보";
    const mood = job.mood || "bright";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다");
    }

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const client = new GoogleGenerativeAI(apiKey);

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

    // 지원 가능한 Gemini 모델 후보군 순서대로 시도
    const modelsToTry = [
      process.env.GEMINI_MODEL || "gemini-1.5-flash",
      "gemini-2.0-flash",
    ];

    let content = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Step 2] Gemini 모델 시도 중: ${modelName}`);
        const model = client.getGenerativeModel({ model: modelName });

        // 30초 타임아웃 설정
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${modelName} API 타임아웃 (30초)`)), 30000)
        );

        const response = await Promise.race([
          model.generateContent(prompt),
          timeoutPromise
        ]);

        content = response.response.text();
        if (content) {
          console.log(`[Step 2] ${modelName} 호출 성공! (응답 길이: ${content.length}자)`);
          break;
        }
      } catch (err) {
        console.warn(`[Step 2] ${modelName} 호출 실패:`, {
          message: err.message,
          code: err.code,
          status: err.status
        });
        lastError = err;
      }
    }

    if (!content) {
      throw new Error(`모든 Gemini 모델 호출 실패: ${lastError?.message}`);
    }

    console.log(
      "[Step 2] Gemini 원본 응답:",
      content.substring(0, 200) + "...",
    );

    let jsonText = content;
    if (content.includes("```json")) {
      jsonText = content.split("```json")[1]?.split("```")[0] || content;
    } else if (content.includes("```")) {
      jsonText = content.split("```")[1] || content;
    }
    jsonText = jsonText.trim();

    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("[Step 2] JSON 파싱 실패:", jsonText);
      throw new Error(`Gemini 응답 파싱 실패: ${parseError.message}`);
    }

    const duration = Date.now() - startTime;
    await updateStep2Results(jobId, result, duration, false);

    console.log(`[✅ Step 2 완료] Gemini 자막 생성 (${duration}ms)\n`);
  } catch (error) {
    console.error("[❌ Step 2 실패] 상세 정보:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status
    });

    // Gemini API 호출 실패시 Fallback 기본 대사 사용
    console.log(`[⚠️ Fallback] 기본 대사 템플릿으로 대체하여 진행합니다. (카테고리: ${storeCategory})`);

    try {
      const fallbackResult = generateFallbackCaption(
        storeCategory,
        signatureMenu,
      );
      console.log("[Step 2] Fallback 대사 생성 완료:", {
        primary_caption: fallbackResult.primary_caption,
        hashtags: fallbackResult.hashtags
      });

      const duration = Date.now() - startTime;
      await updateStep2Results(jobId, fallbackResult, duration, true);

      console.log(
        `[✅ Step 2 Fallback 완료] 기본 대사 DB 저장 완료 (${duration}ms)\n`,
      );
    } catch (fallbackError) {
      console.error("[❌ Step 2 Fallback 처리 실패]", {
        message: fallbackError.message,
        originalError: error.message
      });
      throw new Error(`Step 2 처리 중 오류 발생: ${error.message} → Fallback 처리도 실패: ${fallbackError.message}`);
    }
  }
}

/**
 * Step 2 DB 업데이트 헬퍼 함수 (DB Check Constraint 완벽 지원)
 */
async function updateStep2Results(jobId, result, duration, isFallback = false) {
  const supabase = getSupabaseClient();
  const captionOptions = result.caption_options || [];

  if (typeof result.primary_caption !== "string") {
    result.primary_caption = String(result.primary_caption || "멋진 영상");
  }

  // generation_jobs 테이블 업데이트
  const { error: jobUpdateError } = await supabase
    .from("generation_jobs")
    .update({
      step2_caption: result.primary_caption,
      step2_hashtags: result.hashtags,
      step2_similarity_score: result.similarity_score || 0.7,
      progress: 50,
      current_step: 2,
    })
    .eq("job_id", jobId);

  if (jobUpdateError) {
    throw new Error(
      `Step 2 DB 저장 실패 (generation_jobs): ${jobUpdateError.message}`,
    );
  }

  // generation_steps 테이블 업데이트 (status는 무조건 'completed'로 저장하여 DB 제약조건 충돌 방지)
  const { error: stepUpdateError } = await supabase
    .from("generation_steps")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      notes: isFallback ? "Gemini API 실패 - 기본 대사 사용" : null,
    })
    .eq("job_id", jobId)
    .eq("step_number", 2);

  if (stepUpdateError) {
    throw new Error(
      `Step 2 DB 저장 실패 (generation_steps): ${stepUpdateError.message}`,
    );
  }
}

/**
 * Gemini API 실패 시 Fallback 대사 생성
 */
function generateFallbackCaption(storeCategory, signatureMenu) {
  const fallbackCaptions = {
    카페: "☕ 이 커피를 놓치지 마세요! 지금 방문해보세요 👉",
    음식점: "🍜 맛있는 맛집! 꼭 와서 먹어봐야 해요 👉",
    한식: "🥢 우리 한식의 참맛! 지금 주문하세요 👉",
    양식: "🍝 정성 가득한 양식! 오늘 저녁은 여기로 👉",
    중식: "🥡 대박 맛! 이 맛 어디서 먹어봤어? 👉",
    카테고리: `✨ ${signatureMenu || "시그니처 메뉴"}를 지금 즐겨보세요! 👉`,
  };

  const primaryCaption =
    fallbackCaptions[storeCategory] || fallbackCaptions["카테고리"];

  return {
    primary_caption: primaryCaption,
    caption_options: [
      { text: "지금 바로 방문해보세요! 🎉", similarity: 0.75 },
      { text: "이 맛을 놓칠 수 없어요! 💯", similarity: 0.7 },
      { text: "최고의 선택! 추천합니다 ⭐", similarity: 0.68 },
    ],
    hashtags: "#맛집 #추천 #꼭와봐야해",
    similarity_score: 0.7,
  };
}

/**
 * Step 3: TTS 음성 생성
 */
async function runStep3(jobId) {
  const supabase = getSupabaseClient();
  const startTime = Date.now();

  try {
    console.log("[Step 3] TTS 음성 생성 실행 중...");

    const { data: job, error: jobError } = await supabase
      .from("generation_jobs")
      .select("step2_caption")
      .eq("job_id", jobId)
      .single();

    if (jobError || !job?.step2_caption) {
      throw new Error("자막 정보를 찾을 수 없습니다");
    }

    const caption = job.step2_caption;

    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);

    let result;
    try {
      const pythonScriptPath = path.resolve(
        __dirname,
        "../../ai-pipeline/tts_generate.py",
      );
      console.log("[Step 3] TTS 입력 자막:", caption);

      const { stdout, stderr } = await execFileAsync("python", [
        pythonScriptPath,
        caption,
        "ko",
      ]);

      if (stderr) console.log("[Step 3] Python stderr:", stderr);

      result = JSON.parse(stdout);
    } catch (pythonError) {
      throw new Error(`TTS 실행 실패: ${pythonError.message}`);
    }

    if (result.status !== "success") {
      throw new Error(result.message || "TTS 처리 실패");
    }

    let audioUrl = result.audio_path;
    let localAudioPath = audioUrl;

    if (!audioUrl.startsWith("http")) {
      let cleanPath = audioUrl;
      if (cleanPath.startsWith("/")) cleanPath = cleanPath.slice(1);
      if (cleanPath.startsWith("backend/"))
        cleanPath = cleanPath.slice("backend/".length);

      localAudioPath = path.resolve(process.cwd(), cleanPath);
      const filename = path.basename(localAudioPath);

      if (fs.existsSync(localAudioPath)) {
        try {
          const fileBuffer = fs.readFileSync(localAudioPath);
          const storagePath = `audio/${jobId}_${Date.now()}.mp3`;

          const { error: uploadError } = await supabase.storage
            .from("uploads")
            .upload(storagePath, fileBuffer);

          if (!uploadError) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("uploads").getPublicUrl(storagePath);
            audioUrl = publicUrl;
          } else {
            audioUrl = `/ai-output/${filename}`;
          }
        } catch {
          audioUrl = `/ai-output/${filename}`;
        }
      } else {
        audioUrl = `/ai-output/${filename}`;
      }
    }

    const duration = Date.now() - startTime;

    await supabase
      .from("generation_jobs")
      .update({
        step3_audio_url: audioUrl,
        progress: 75,
        current_step: 3,
      })
      .eq("job_id", jobId);

    await supabase
      .from("generation_steps")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_ms: duration,
      })
      .eq("job_id", jobId)
      .eq("step_number", 3);

    console.log(`[✅ Step 3 완료] TTS 음성 생성 (${duration}ms)\n`);
  } catch (error) {
    console.error("[❌ Step 3 실패]", error);
    throw error;
  }
}

/**
 * Step 4: FFmpeg 영상 렌더링
 */
async function runStep4(jobId) {
  const supabase = getSupabaseClient();
  const startTime = Date.now();

  try {
    console.log("[Step 4] FFmpeg 영상 렌더링 실행 중...");

    const { data: job, error: jobError } = await supabase
      .from("generation_jobs")
      .select(
        "step1_cropped_image_url, step3_audio_url, step2_caption, step2_hashtags",
      )
      .eq("job_id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error("Job 정보를 찾을 수 없습니다");
    }

    let imageUrl = job.step1_cropped_image_url;
    let audioUrl = job.step3_audio_url;
    const caption = job.step2_caption || "멋진 영상";

    let hashtags = job.step2_hashtags || "#트렌드";
    if (typeof hashtags === "string") {
      hashtags = hashtags.split(" ").filter(Boolean);
    } else if (!Array.isArray(hashtags)) {
      hashtags = ["#트렌드"];
    }

    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);

    if (imageUrl && imageUrl.startsWith("/ai-output/")) {
      const filename = imageUrl.replace("/ai-output/", "");
      imageUrl = path.resolve(process.cwd(), "ai-pipeline/output", filename);
    }
    if (audioUrl && audioUrl.startsWith("/ai-output/")) {
      const filename = audioUrl.replace("/ai-output/", "");
      audioUrl = path.resolve(process.cwd(), "ai-pipeline/output", filename);
    }

    let result;
    try {
      const pythonScriptPath = path.resolve(
        __dirname,
        "../../ai-pipeline/ffmpeg_render_enhanced.py",
      );

      const { stdout, stderr } = await execFileAsync("python", [
        pythonScriptPath,
        imageUrl || "",
        audioUrl || "",
        caption || "",
        JSON.stringify(hashtags || []),
      ]);

      if (stderr) console.log("[Step 4] Python stderr:", stderr);

      result = JSON.parse(stdout);
    } catch (pythonError) {
      throw new Error(`FFmpeg 실행 실패: ${pythonError.message}`);
    }

    let videoUrl = result.video_path;
    let thumbnailUrl = result.thumbnail_path;

    if (!videoUrl.startsWith("http")) {
      let cleanPath = videoUrl;
      if (cleanPath.startsWith("/")) cleanPath = cleanPath.slice(1);
      if (cleanPath.startsWith("backend/"))
        cleanPath = cleanPath.slice("backend/".length);

      const localVideoPath = path.resolve(process.cwd(), cleanPath);
      const videoFilename = path.basename(localVideoPath);

      if (fs.existsSync(localVideoPath)) {
        try {
          const fileBuffer = fs.readFileSync(localVideoPath);
          const storagePath = `videos/${jobId}_${Date.now()}.mp4`;

          const { error: uploadError } = await supabase.storage
            .from("uploads")
            .upload(storagePath, fileBuffer);

          if (!uploadError) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("uploads").getPublicUrl(storagePath);
            videoUrl = publicUrl;
          } else {
            videoUrl = `/ai-output/${videoFilename}`;
          }
        } catch {
          videoUrl = `/ai-output/${videoFilename}`;
        }
      } else {
        videoUrl = `/ai-output/${videoFilename}`;
      }
    }

    if (!thumbnailUrl.startsWith("http")) {
      let cleanPath = thumbnailUrl;
      if (cleanPath.startsWith("/")) cleanPath = cleanPath.slice(1);
      if (cleanPath.startsWith("backend/"))
        cleanPath = cleanPath.slice("backend/".length);

      const localThumbnailPath = path.resolve(process.cwd(), cleanPath);
      const thumbnailFilename = path.basename(localThumbnailPath);

      if (fs.existsSync(localThumbnailPath)) {
        try {
          const fileBuffer = fs.readFileSync(localThumbnailPath);
          const storagePath = `thumbnails/${jobId}_${Date.now()}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from("uploads")
            .upload(storagePath, fileBuffer);

          if (!uploadError) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("uploads").getPublicUrl(storagePath);
            thumbnailUrl = publicUrl;
          } else {
            thumbnailUrl = `/ai-output/${thumbnailFilename}`;
          }
        } catch {
          thumbnailUrl = `/ai-output/${thumbnailFilename}`;
        }
      } else {
        thumbnailUrl = `/ai-output/${thumbnailFilename}`;
      }
    }

    const duration = Date.now() - startTime;
    await supabase
      .from("generation_jobs")
      .update({
        step4_video_url: videoUrl,
        step4_thumbnail_url: thumbnailUrl,
        progress: 100,
        current_step: 4,
      })
      .eq("job_id", jobId);

    await supabase
      .from("generation_steps")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_ms: duration,
      })
      .eq("job_id", jobId)
      .eq("step_number", 4);

    console.log(`[✅ Step 4 완료] FFmpeg 영상 렌더링 (${duration}ms)\n`);
  } catch (error) {
    console.error("[❌ Step 4 실패]", error);
    throw error;
  }
}

export default runPipeline;
