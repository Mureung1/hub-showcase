# 🤖 AI 파이프라인 구현 가이드

## 📍 현재 상황

```
지금까지 한 것:
✅ Job 생성 (POST /api/generate)
   └─ "queued" 상태로 저장만 함
   └─ 실제 처리는 안 함

해야 할 것:
❌ Job을 "queued" → "processing"으로 변경
❌ Step 1: YOLOv8 실행
❌ Step 2: KoBERT 실행
❌ Step 3: TTS 실행
❌ Step 4: FFmpeg 실행
```

---

## 🔄 전체 처리 흐름

```
1️⃣  사용자가 "릴스 생성하기" 클릭
    ↓
2️⃣  POST /api/generate 호출
    └─ Job 생성: id = "uuid-123", status = "queued"
    ↓
3️⃣  [백엔드] 백그라운드 작업 시작
    ├─ Step 1: YOLOv8 크롭 (3초)
    ├─ Step 2: KoBERT 캡션 (2초)
    ├─ Step 3: TTS 음성 (2초)
    └─ Step 4: FFmpeg 렌더링 (8초)
    ↓
4️⃣  사용자가 GET /api/generate/uuid-123 폴링
    ├─ 1초마다 요청
    ├─ 진행률 받기
    └─ 완료될 때까지 반복
    ↓
5️⃣  모든 단계 완료
    ├─ status = "completed"
    ├─ step4_video_url = "https://..."
    └─ Review 페이지 자동 이동
```

---

## 🛠️ 구현 방향

### **전체 구조: 2가지 방식**

#### **방식 A: 간단함 (지금 추천) ⭐**

```
POST /api/generate
  ↓
Job 생성 (queued)
  ↓
즉시 처리 시작 (동기 방식)
├─ YOLOv8 실행 (대기)
├─ KoBERT 실행 (대기)
├─ TTS 실행 (대기)
├─ FFmpeg 실행 (대기)
  ↓
모든 단계 완료 → status = "completed"

장점: 구현 간단
단점: 사용자가 45초 대기 (느려 보임)
```

#### **방식 B: 전문적 (나중에) 🚀**

```
POST /api/generate
  ↓
Job 생성 (queued)
  ↓
백그라운드 워커 큐에 추가 (비동기)
  └─ Redis/Bull/RabbitMQ 사용
  
별도의 워커 프로세스가 처리
├─ YOLOv8 실행
├─ KoBERT 실행
├─ TTS 실행
├─ FFmpeg 실행
  ↓
DB 업데이트 → status = "completed"

장점: 동시에 여러 작업 처리 가능
단점: 구현 복잡 (Redis 설치 필요)
```

**지금은 방식 A로 시작하겠습니다!**

---

## 📋 구현 체크리스트

### **Phase 1: 기본 파이프라인 구조** (1-2시간)

```
[ ] 1. backend/src/services/pipeline.js 생성
      └─ async function runPipeline(jobId) { ... }

[ ] 2. POST /api/generate에 파이프라인 호출 추가
      └─ Job 생성 후 바로 runPipeline(jobId) 호출

[ ] 3. DB 업데이트 함수들 생성
      └─ updateJobStatus()
      └─ updateStepStatus()
      └─ updateJobProgress()
```

---

### **Phase 2: Step 1 - YOLOv8** (2-3시간)

```
[ ] 1. backend/ai-pipeline/yolov8_crop.py 생성
      ├─ YOLOv8 모델 로드
      ├─ 이미지 분석
      ├─ 상품 영역 감지
      └─ 크롭된 이미지 저장

[ ] 2. backend/src/services/step1_yolov8.js 생성
      ├─ Python 스크립트 실행
      ├─ 크롭된 이미지를 Supabase에 업로드
      └─ generation_jobs.step1_cropped_image_url 저장

[ ] 3. pipeline.js에 Step 1 호출 추가
      └─ await runStep1(jobId)

테스트:
  - 이미지 업로드 → YOLOv8 실행 → DB 확인
```

---

### **Phase 3: Step 2 - KoBERT** (2-3시간)

```
[ ] 1. backend/ai-pipeline/kobert_caption.py 생성
      ├─ KoBERT 모델 로드
      ├─ 트렌드 해시태그 분석
      ├─ 상품 라벨 분석
      └─ 자막 생성

[ ] 2. backend/src/services/step2_kobert.js 생성
      ├─ Python 스크립트 실행
      ├─ 반환된 캡션 파싱
      └─ generation_jobs.step2_caption 저장

[ ] 3. pipeline.js에 Step 2 호출 추가
      └─ await runStep2(jobId)

테스트:
  - YOLOv8 완료 → KoBERT 실행 → 캡션 생성 확인
```

---

### **Phase 4: Step 3 - TTS** (1-2시간)

```
[ ] 1. Google Cloud TTS 계정 설정
      └─ credentials.json 다운로드

[ ] 2. backend/src/services/step3_tts.js 생성
      ├─ Google Cloud TTS API 호출
      ├─ 한국어 음성 생성
      └─ Supabase에 업로드

[ ] 3. pipeline.js에 Step 3 호출 추가
      └─ await runStep3(jobId)

테스트:
  - KoBERT 캡션 → TTS 실행 → 음성 파일 생성 확인
```

---

### **Phase 5: Step 4 - FFmpeg** (2-3시간)

```
[ ] 1. FFmpeg 환경 설정
      └─ npm install fluent-ffmpeg

[ ] 2. backend/src/services/step4_ffmpeg.js 생성
      ├─ 크롭 이미지 로드
      ├─ 음성 파일 로드
      ├─ FFmpeg 명령 생성
      │  └─ 이미지 → 15초 영상
      │  └─ + 음성 추가
      │  └─ + 자막 오버레이
      │  └─ + 9:16 비율 설정
      ├─ 최종 MP4 렌더링
      └─ Supabase에 업로드

[ ] 3. pipeline.js에 Step 4 호출 추가
      └─ await runStep4(jobId)

테스트:
  - TTS 음성 → FFmpeg 실행 → MP4 파일 생성 확인
```

---

## 🏗️ 코드 구조 (개요)

### 현재 파일 구조

```
backend/
├── src/
│   ├── routes/
│   │   └── generate.js          ← API 엔드포인트
│   │
│   └── services/
│       ├── pipeline.js          ← NEW: 파이프라인 오케스트레이션
│       ├── step1_yolov8.js      ← NEW: Step 1
│       ├── step2_kobert.js      ← NEW: Step 2
│       ├── step3_tts.js         ← NEW: Step 3
│       └── step4_ffmpeg.js      ← NEW: Step 4
│
└── ai-pipeline/
    ├── yolov8_crop.py          ← NEW: Python 스크립트
    ├── kobert_caption.py        ← NEW: Python 스크립트
    └── ffmpeg_render.py         ← NEW: Python 스크립트
```

---

## 📝 코드 예시

### Step 1 예시: backend/src/services/step1_yolov8.js

```javascript
import { execFile } from 'child_process';
import { getSupabaseClient } from '../db/supabaseClient.js';
import fs from 'fs';

export async function runStep1(jobId) {
  const supabase = getSupabaseClient();

  try {
    // 1. Job 상태 업데이트: processing
    await supabase
      .from('generation_jobs')
      .update({ 
        status: 'processing', 
        current_step: 1,
        started_at: new Date().toISOString()
      })
      .eq('job_id', jobId);

    // 2. 원본 이미지 가져오기
    const { data: job } = await supabase
      .from('generation_jobs')
      .select('original_image_url')
      .eq('job_id', jobId)
      .single();

    // 3. Python 스크립트 실행 (YOLOv8)
    const croppedImagePath = await new Promise((resolve, reject) => {
      execFile('python', ['ai-pipeline/yolov8_crop.py', job.original_image_url], 
        (error, stdout, stderr) => {
          if (error) reject(error);
          resolve(stdout.trim()); // 크롭된 이미지 경로 반환
        }
      );
    });

    // 4. 크롭된 이미지를 Supabase에 업로드
    const fileBuffer = fs.readFileSync(croppedImagePath);
    const storagePath = `cropped/${jobId}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, fileBuffer);

    if (uploadError) throw uploadError;

    // 5. 공개 URL 획득
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(storagePath);

    // 6. DB 업데이트: Step 1 완료
    await supabase
      .from('generation_jobs')
      .update({
        step1_cropped_image_url: publicUrl,
        progress: 25
      })
      .eq('job_id', jobId);

    // 7. generation_steps 업데이트
    await supabase
      .from('generation_steps')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: 3200  // 3.2초
      })
      .eq('job_id', jobId)
      .eq('step_number', 1);

    console.log(`[Step 1 완료] job_id: ${jobId}`);
    return true;

  } catch (error) {
    console.error(`[Step 1 실패] job_id: ${jobId}`, error);
    
    // 에러 저장
    await supabase
      .from('generation_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        error_step: 1
      })
      .eq('job_id', jobId);
    
    throw error;
  }
}
```

### Pipeline 오케스트레이션: backend/src/services/pipeline.js

```javascript
import { runStep1 } from './step1_yolov8.js';
import { runStep2 } from './step2_kobert.js';
import { runStep3 } from './step3_tts.js';
import { runStep4 } from './step4_ffmpeg.js';
import { getSupabaseClient } from '../db/supabaseClient.js';

export async function runPipeline(jobId) {
  const supabase = getSupabaseClient();

  try {
    console.log(`[Pipeline 시작] job_id: ${jobId}`);

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

    console.log(`[Pipeline 완료] job_id: ${jobId}`);

  } catch (error) {
    console.error(`[Pipeline 실패] job_id: ${jobId}`, error);
    // 에러는 각 Step에서 처리됨
  }
}
```

### POST /api/generate에서 호출

```javascript
// backend/src/routes/generate.js 수정

router.post('/', upload.single('image'), async (req, res) => {
  // ... 기존 코드 (Job 생성까지) ...

  // 🔴 여기 추가:
  // Job 생성 후 바로 파이프라인 시작
  runPipeline(jobId).catch(error => {
    console.error('Pipeline 오류:', error);
  });

  // 응답 반환 (202 Accepted)
  res.status(202).json({
    job_id: jobId,
    status: 'queued',
    message: '파이프라인이 대기열에 추가되었습니다',
    estimated_time: 45
  });
});
```

---

## 🎯 구현 순서

### **1주일 계획**

```
Day 1 (월): Phase 1 - 기본 파이프라인 구조
├─ pipeline.js 생성
├─ DB 업데이트 함수 작성
└─ POST /api/generate 수정

Day 2-3 (화~수): Phase 2 - YOLOv8
├─ Python 환경 설정
├─ yolov8_crop.py 작성
└─ step1_yolov8.js 작성 + 테스트

Day 4-5 (목~금): Phase 3 - KoBERT
├─ KoBERT 모델 설정
├─ kobert_caption.py 작성
└─ step2_kobert.js 작성 + 테스트

Day 6 (토): Phase 4 - TTS
├─ Google Cloud 설정
└─ step3_tts.js 작성 + 테스트

Day 7 (일): Phase 5 - FFmpeg
├─ FFmpeg 설정
├─ step4_ffmpeg.js 작성 + 테스트
└─ End-to-End 테스트
```

---

## 🚀 다음 단계

### **지금 바로 시작 가능 (1시간)**

1. **Supabase 테이블 생성** (5분)
   - `docs/SETUP_SUPABASE_TABLES.md` 참조

2. **Pipeline.js 구조 만들기** (30분)
   - 기본 오케스트레이션 함수만 작성
   - 각 Step은 아직 Mock

3. **POST /api/generate 수정** (15분)
   - Job 생성 후 runPipeline() 호출 추가

4. **프론트엔드 폴링 구현** (20분)
   - GET /api/generate/{job_id} 폴링 추가

**이렇게 하면 "흐름"이 생깁니다!**

---

## 💡 팁

- 각 Step을 **독립적인 파일**로 만들면 나중에 수정하기 쉬움
- Python 스크립트는 **표준 입출력**으로 Node.js와 통신
- 매번 테스트할 때마다 **전체 흐름**을 시뮬레이션하기
- 에러 처리를 **중간에 처리**하면 중단하고 다시 시작 가능

