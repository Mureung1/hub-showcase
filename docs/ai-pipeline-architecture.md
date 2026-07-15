# 🤖 AI 파이프라인 아키텍처

## 📐 전체 플로우

```
┌─────────────┐
│ 사용자 입력  │
│ - 이미지    │
│ - 트렌드    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                  AI 파이프라인 (백엔드)                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Step 1: YOLOv8 스마트 크롭                              │
│  ├─ Input: 상품 이미지 (JPG/PNG)                        │
│  ├─ Process: 물체 감지 + 자동 크롭                       │
│  └─ Output: 크롭된 이미지 (최적 구도)                    │
│                                                           │
│  Step 2: KoBERT 트렌드 매칭                              │
│  ├─ Input: 트렌드 해시태그 + 크롭 이미지                 │
│  ├─ Process: 의미론적 유사도 계산 → 자동 캡션 생성      │
│  └─ Output: 최적화된 자막 텍스트 (한글)                  │
│                                                           │
│  Step 3: TTS 음성 생성                                   │
│  ├─ Input: 자막 텍스트                                   │
│  ├─ Process: 한국어 음성 합성                            │
│  └─ Output: 음성 파일 (MP3/WAV)                          │
│                                                           │
│  Step 4: FFmpeg 영상 렌더링                              │
│  ├─ Input: 크롭 이미지 + 음성 + 자막                     │
│  ├─ Process: 9:16 수직 영상 + 오버레이 생성              │
│  └─ Output: 최종 MP4 파일 (15초)                         │
│                                                           │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────┐
│ 최종 영상 저장   │
│ - Supabase       │
│ - 로컬 파일      │
└──────────────────┘
```

---

## 🔌 API 엔드포인트 설계

### **1. 파이프라인 시작**

```http
POST /api/generate
Content-Type: multipart/form-data

Body:
{
  "store_id": 1,
  "image": <File>,              # 업로드된 이미지
  "trend_hashtag": "#신메뉴",    # 선택한 트렌드
  "campaign_type": "promotion",  # 프로모션 타입
  "mood": "excited"              # 영상 분위기
}

Response (202 Accepted - 비동기 처리):
{
  "job_id": "gen_uuid_12345",
  "status": "queued",
  "message": "파이프라인 시작됨",
  "estimated_time": 45  # 초 단위
}
```

### **2. 파이프라인 진행 상태 조회**

```http
GET /api/generate/{job_id}

Response:
{
  "job_id": "gen_uuid_12345",
  "status": "processing",  # queued | processing | completed | failed
  "current_step": 2,       # 1(YOLOv8) | 2(KoBERT) | 3(TTS) | 4(FFmpeg)
  "progress": 50,          # 0-100
  "steps": [
    {
      "name": "YOLOv8 스마트 크롭",
      "status": "completed",
      "duration": 3.5,  # 초
      "output": {
        "image_path": "/uploads/cropped_uuid.png",
        "confidence": 0.95
      }
    },
    {
      "name": "KoBERT 트렌드 매칭",
      "status": "completed",
      "duration": 2.1,
      "output": {
        "caption": "최신 신메뉴를 만나보세요! 🍜",
        "hashtags": ["#신메뉴", "#맛있다", "#카페"]
      }
    },
    {
      "name": "TTS 음성 생성",
      "status": "in_progress",
      "duration": null,
      "output": null
    },
    {
      "name": "FFmpeg 렌더링",
      "status": "pending",
      "duration": null,
      "output": null
    }
  ],
  "error": null
}
```

### **3. 생성된 영상 조회**

```http
GET /api/generate/{job_id}/result

Response (200 - 완료 시):
{
  "job_id": "gen_uuid_12345",
  "status": "completed",
  "video": {
    "video_id": 123,
    "video_url": "https://storage.example.com/videos/vid_uuid.mp4",
    "duration": 15,
    "resolution": "1080x1920",
    "file_size": 5242880,  # Bytes
    "thumbnail": "https://storage.example.com/thumbnails/vid_uuid.jpg"
  },
  "metadata": {
    "caption": "최신 신메뉴를 만나보세요! 🍜",
    "hashtags": ["#신메뉴", "#맛있다", "#카페"],
    "trend": "#신메뉴",
    "created_at": "2026-07-15T10:30:00Z"
  }
}
```

---

## 🛠️ 각 단계별 기술 스택

### **Step 1: YOLOv8 스마트 크롭**

**목적**: 상품 영역 자동 감지 → 최적 구도 크롭

**기술**:
- **YOLOv8**: 물체 감지 (Ultralytics)
- **Python**: OpenCV로 이미지 처리
- **입력**: JPG/PNG 이미지
- **출력**: 크롭된 PNG 이미지 (정사각형 또는 9:16)

**처리 시간**: ~3-5초

**Python 스크립트** (`backend/ai-pipeline/yolov8_crop.py`):
```python
from ultralytics import YOLO
import cv2

def smart_crop(image_path):
    model = YOLO('yolov8m.pt')  # 물체 감지 모델
    results = model.predict(image_path, conf=0.5)
    
    # 가장 신뢰도 높은 물체 추출
    boxes = results[0].boxes
    if len(boxes) == 0:
        return None  # 물체 없음
    
    best_box = boxes[0]  # 신뢰도 순 정렬됨
    cropped = crop_image(image_path, best_box)
    return cropped
```

---

### **Step 2: KoBERT 트렌드 매칭**

**목적**: 이미지 + 트렌드 → 최적화된 자막 텍스트 생성

**기술**:
- **KoBERT**: 한국어 의미론적 분석
- **Python**: Transformers 라이브러리
- **입력**: 트렌드 해시태그 + 이미지 특성 (라벨)
- **출력**: 자막 텍스트 (한글, 최대 50자)

**처리 시간**: ~2-3초

**로직**:
1. 트렌드 해시태그 → 임베딩 벡터화
2. 이미지 라벨(YOLOv8 출력) → 벡터화
3. 코사인 유사도 계산
4. 템플릿 기반 자막 생성

**Python 스크립트** (`backend/ai-pipeline/kobert_caption.py`):
```python
from transformers import pipeline
import numpy as np

def generate_caption(trend_hashtag, product_label):
    # KoBERT 임베딩
    embedder = pipeline("feature-extraction", model="monologg/kobert")
    trend_embed = embedder(trend_hashtag)
    product_embed = embedder(product_label)
    
    # 유사도 기반 템플릿 선택
    similarity = cosine_similarity(trend_embed, product_embed)
    
    # 자막 생성
    caption = generate_template(trend_hashtag, product_label, similarity)
    return caption
```

---

### **Step 3: TTS (Text-to-Speech)**

**목적**: 자막 텍스트 → 음성 파일

**기술 선택**:
- **Option A (권장)**: Google Cloud TTS API
  - 자연스러운 한국어 음성
  - 요금 기반 (약 $16/100만자)
- **Option B**: Naver Clova Voice API
  - 한국형 자연스러운 음성
  - 요금 기반
- **Option C**: 오픈소스 (gTTS + espeak)
  - 무료이지만 음질 낮음

**처리 시간**: ~1-2초

**Python 스크립트** (`backend/ai-pipeline/tts_generate.py`):
```python
from google.cloud import texttospeech

def generate_voice(text, output_path):
    client = texttospeech.TextToSpeechClient()
    
    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code="ko-KR",
        name="ko-KR-Neural2-C"  # 자연스러운 여성 음성
    )
    
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )
    
    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config
    )
    
    with open(output_path, "wb") as out:
        out.write(response.audio_content)
```

---

### **Step 4: FFmpeg 영상 렌더링**

**목적**: 이미지 + 음성 + 자막 → 최종 15초 MP4

**기술**:
- **FFmpeg**: 비디오 렌더링 (ffmpeg-python)
- **Python**: moviepy 또는 subprocess 호출

**처리 시간**: ~5-10초

**로직**:
1. 이미지 → 15초 동영상으로 변환 (정적 이미지를 15초 확장)
2. 오디오(TTS) 추가 및 동기화
3. 텍스트 오버레이 추가 (자막 + 해시태그)
4. 색상 그래디언트 추가 (선택사항)
5. 9:16 비율 강제 설정

**Python 스크립트** (`backend/ai-pipeline/ffmpeg_render.py`):
```python
import subprocess

def render_video(image_path, audio_path, caption_text, output_path):
    # FFmpeg 명령어
    cmd = [
        "ffmpeg",
        "-loop", "1",                           # 이미지 반복
        "-i", image_path,                       # 입력 이미지
        "-i", audio_path,                       # 입력 음성
        "-c:v", "libx264",                      # H.264 코덱
        "-c:a", "aac",                          # AAC 오디오
        "-shortest",                             # 가장 짧은 길이만큼
        "-vf", "scale=1080:1920,fps=30",        # 9:16 해상도
        "-metadata", f"title={caption_text}",   # 메타데이터
        "-y",                                    # 덮어쓰기
        output_path
    ]
    
    subprocess.run(cmd, check=True)
```

---

## 📊 데이터 흐름 (상세)

```
사용자 업로드
    ↓
POST /api/generate (multipart/form-data)
    ↓
backend/src/routes/generate.js
├─ 파일 검증 (이미지 형식/크기)
├─ Job 생성 (Supabase: generation_jobs 테이블)
├─ 파이프라인 Queue에 추가
└─ job_id 반환 (202 Accepted)
    ↓
[비동기 작업 시작]
    ↓
Step 1: YOLOv8 (Python 서브프로세스)
├─ 이미지 다운로드 (Supabase Storage)
├─ python backend/ai-pipeline/yolov8_crop.py
├─ 크롭 이미지 저장 (Supabase Storage)
└─ Job 상태 업데이트 (Step 1 완료)
    ↓
Step 2: KoBERT (Python 서브프로세스)
├─ 크롭 이미지 + 트렌드 입력
├─ python backend/ai-pipeline/kobert_caption.py
├─ 캡션 생성
└─ Job 상태 업데이트 (Step 2 완료)
    ↓
Step 3: TTS (Python 서브프로세스 또는 API)
├─ 캡션 텍스트 전달
├─ python backend/ai-pipeline/tts_generate.py
├─ 음성 파일 생성 (Supabase Storage)
└─ Job 상태 업데이트 (Step 3 완료)
    ↓
Step 4: FFmpeg (Python 서브프로세스)
├─ 이미지 + 음성 + 자막 입력
├─ python backend/ai-pipeline/ffmpeg_render.py
├─ 최종 MP4 생성
├─ Supabase Storage에 업로드
└─ Job 상태 업데이트 (완료)
    ↓
사용자: GET /api/generate/{job_id}
└─ 진행도 실시간 조회 (폴링)
    ↓
완료 시: GET /api/generate/{job_id}/result
└─ 최종 영상 URL + 메타데이터 반환
```

---

## 🗄️ 데이터베이스 스키마

### `generation_jobs` (생성 작업 추적)
```sql
CREATE TABLE generation_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id BIGINT REFERENCES store_info(store_id),
  status TEXT CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  current_step INT,  -- 1, 2, 3, 4
  progress INT,      -- 0-100
  
  -- 입력 데이터
  trend_hashtag TEXT,
  campaign_type TEXT,
  mood TEXT,
  original_image_url TEXT,
  
  -- 각 단계별 출력
  step1_cropped_image_url TEXT,
  step2_caption TEXT,
  step2_hashtags TEXT[],
  step3_audio_url TEXT,
  step4_video_url TEXT,
  step4_thumbnail_url TEXT,
  
  error_message TEXT,
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  
  CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 100)
);
```

### `generation_steps` (단계별 로깅)
```sql
CREATE TABLE generation_steps (
  step_id SERIAL PRIMARY KEY,
  job_id UUID REFERENCES generation_jobs(job_id) ON DELETE CASCADE,
  step_number INT,      -- 1, 2, 3, 4
  step_name TEXT,
  status TEXT,          -- completed, failed, in_progress
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INT,
  error_message TEXT,
  metadata JSONB        -- 단계별 추가 정보
);
```

---

## ⚙️ 설정 및 환경변수

### `.env` (backend)
```env
# AI 파이프라인 설정
AI_PIPELINE_ENABLED=true
AI_PIPELINE_WORKERS=2          # 병렬 작업 수
AI_PIPELINE_TIMEOUT=300        # 타임아웃 (초)

# YOLOv8
YOLOV8_MODEL_PATH=/models/yolov8m.pt
YOLOV8_CONFIDENCE=0.5

# KoBERT
KOBERT_MODEL_NAME=monologg/kobert
KOBERT_SIMILARITY_THRESHOLD=0.7

# TTS
TTS_PROVIDER=google              # google | naver | free
GOOGLE_CLOUD_API_KEY=***
GOOGLE_CLOUD_PROJECT_ID=***

# FFmpeg
FFMPEG_PATH=/usr/bin/ffmpeg     # 또는 시스템 PATH에서 자동 감지
VIDEO_RESOLUTION=1080x1920
VIDEO_FPS=30
VIDEO_BITRATE=5000k
```

---

## 🔄 에러 처리 및 재시도

```
각 단계별 실패 시:
├─ Step 1 실패 → 전체 실패 (원본 이미지 문제)
├─ Step 2 실패 → 기본 캡션 사용 후 계속
├─ Step 3 실패 → TTS 없이 영상만 생성
└─ Step 4 실패 → 사용자에게 재시도 옵션 제공

재시도 전략:
- 실패한 단계부터 재시작 (전체 다시 하지 않음)
- 최대 3회 재시도
- 지수 백오프 (1초, 2초, 4초)
```

---

## 🚀 구현 순서

### **Phase 1: 기초 (1주)**
1. [ ] `generation_jobs` 테이블 생성
2. [ ] `/api/generate` 엔드포인트 (파일 업로드 + Job 생성)
3. [ ] `/api/generate/{job_id}` 엔드포인트 (상태 조회)

### **Phase 2: YOLOv8 (2주)**
4. [ ] YOLOv8 환경 구축 (Python)
5. [ ] Step 1 파이프라인 구현
6. [ ] 테스트 (샘플 이미지)

### **Phase 3: KoBERT (2주)**
7. [ ] KoBERT 환경 구축
8. [ ] Step 2 파이프라인 구현
9. [ ] 테스트 (캡션 생성)

### **Phase 4: TTS (1주)**
10. [ ] Google Cloud TTS 설정
11. [ ] Step 3 파이프라인 구현
12. [ ] 테스트 (음성 생성)

### **Phase 5: FFmpeg (1주)**
13. [ ] FFmpeg 환경 구축
14. [ ] Step 4 파이프라인 구현
15. [ ] 테스트 (영상 렌더링)

### **Phase 6: 통합 테스트 (1주)**
16. [ ] End-to-End 테스트
17. [ ] 성능 최적화
18. [ ] 에러 처리 강화

---

## 📈 성능 목표

```
목표: 1개 영상 생성 ~45초 이내

Step 1 (YOLOv8):      3-5초   [████░░░░░]
Step 2 (KoBERT):      2-3초   [████░░░░░]
Step 3 (TTS):         1-2초   [███░░░░░░]
Step 4 (FFmpeg):      5-10초  [████████░]
────────────────────────────
총 소요 시간:         15-25초
(대기 시간 제외)

병렬 처리 가능 영역: Step 1, 2, 3은 순차
재시도 로직 포함 시: +최대 30초
```

---

