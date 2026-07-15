# 👤 사용자 시나리오: 영상 생성부터 발행까지

## 📋 전체 흐름

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Setup 페이지 (가게 정보 설정)                        │
│ - 가게명 입력                                                │
│ - 카테고리 선택                                              │
│ - 위치 입력                                                  │
│ - "저장" 클릭                                                │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Dashboard 페이지 (실시간 트렌드 분석)                 │
│ - 실시간 검색 트렌드 표시                                    │
│   #신메뉴, #할인이벤트, #카페 등                            │
│ - 각 트렌드별 검색량 그래프 표시                            │
│ - "이 트렌드로 릴스 만들기" 버튼 클릭                        │
│   (선택한 trend_hashtag를 GenerateView로 전달)              │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Generate 페이지 (이미지 업로드 + 캠페인 기획)         │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 좌측: 이미지 업로드 (드래그앤드롭)                      │  │
│ │                                                        │  │
│ │ [선택된 트렌드 표시]                                   │  │
│ │ #신메뉴                                               │  │
│ │                                                        │  │
│ │ [이미지 드래그앤드롭 영역]                             │  │
│ │ JPG/PNG만 허용, 최대 10MB                             │  │
│ │                                                        │  │
│ │ [업로드 완료 시]                                       │  │
│ │ ✅ 이미지 미리보기 표시                                │  │
│ │ 이미지명: product.jpg                                 │  │
│ │ 크기: 2.5 MB                                          │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 우측: 캠페인 기획                                      │  │
│ │                                                        │  │
│ │ 프로모션 목적 (여러 개 선택):                          │  │
│ │ ☑ 신메뉴 소개                                         │  │
│ │ ☐ 할인 이벤트                                         │  │
│ │ ☐ 가게 분위기                                         │  │
│ │ ☐ 추천 음식                                           │  │
│ │ ☐ 고객 후기                                           │  │
│ │                                                        │  │
│ │ 비디오 무드 (1개 선택):                                │  │
│ │ ◉ 밝고 활기찬                                         │  │
│ │ ○ 세련되고 고급스러운                                  │  │
│ │ ○ 친근하고 편안한                                     │  │
│ │ ○ 신비롭고 매력적인                                   │  │
│ │                                                        │  │
│ │ [🚀 릴스 생성하기] ← 활성화됨                         │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼ "🚀 릴스 생성하기" 클릭
               │
       ┌───────────────────────────────────────┐
       │ 백엔드 API 호출                        │
       │                                       │
       │ POST /api/generate                    │
       │ {                                     │
       │   "store_id": 1,                      │
       │   "image": <File>,                    │
       │   "trend_hashtag": "#신메뉴",         │
       │   "purpose": "신메뉴 소개",           │
       │   "mood": "bright"                    │
       │ }                                     │
       │                                       │
       │ Response: 202 Accepted                │
       │ {                                     │
       │   "job_id": "gen_uuid_12345",         │
       │   "status": "queued"                  │
       │ }                                     │
       └───────────┬───────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Processing 페이지 (진행 상황 실시간 표시)            │
│                                                              │
│ 🔄 파이프라인이 진행 중입니다... (약 30-45초)              │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Step 1: YOLOv8 스마트 크롭                  [████░░░]  │  │
│ │ 상품 영역 자동 감지 중...                   진행률: 25%  │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Step 2: KoBERT 트렌드 매칭           [░░░░░░░░░░░░░░]  │  │
│ │ 대기 중...                                             │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Step 3: TTS 음성 생성                [░░░░░░░░░░░░░░]  │  │
│ │ 대기 중...                                             │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Step 4: FFmpeg 영상 렌더링           [░░░░░░░░░░░░░░]  │  │
│ │ 대기 중...                                             │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ 💡 Tip: 이 과정은 자동으로 진행됩니다.                     │
│         페이지를 벗어나도 백그라운드에서 계속 진행합니다.  │
└──────────────┬──────────────────────────────────────────────┘
               │
        [백엔드: AI 파이프라인 실행]
               │
        Step 1: YOLOv8
        ├─ 이미지 분석
        ├─ 상품 영역 감지 (신뢰도 95%)
        ├─ 최적 구도로 크롭
        └─ ✅ 완료 (3초)
               │
        Step 2: KoBERT  
        ├─ 트렌드 "#신메뉴" 분석
        ├─ 상품명 "스파이시 국수" 추출
        ├─ 의미론적 매칭
        ├─ 자막 생성: "🍜 스파이시한 신메뉴가 등장했어요!"
        └─ ✅ 완료 (2초)
               │
        Step 3: TTS
        ├─ Google Cloud TTS API 호출
        ├─ 한국어 여성 음성 생성
        ├─ 음성 파일 저장
        └─ ✅ 완료 (1초)
               │
        Step 4: FFmpeg
        ├─ 크롭된 이미지를 15초 영상으로 확장
        ├─ 음성(TTS) 추가
        ├─ 자막 오버레이 추가
        ├─ 9:16 비율 강제 설정
        ├─ MP4 인코딩 (H.264 + AAC)
        ├─ Supabase Storage에 업로드
        └─ ✅ 완료 (8초)
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Review 페이지 (최종 영상 확인)                       │
│                                                              │
│ ✅ 영상 생성 완료!                                          │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │                                                        │  │
│ │            [영상 미리보기 (9:16)]                     │  │
│ │                                                        │  │
│ │    ┌──────────────────────────────────┐               │  │
│ │    │                                  │               │  │
│ │    │                                  │               │  │
│ │    │  🍜 스파이시한 신메뉴가         │               │  │
│ │    │  등장했어요!                    │               │  │
│ │    │                                  │               │  │
│ │    │  #신메뉴 #맛있다 #카페           │               │  │
│ │    │                                  │               │  │
│ │    │  [재생 시간: 15초]               │               │  │
│ │    │                                  │               │  │
│ │    └──────────────────────────────────┘               │  │
│ │                                                        │  │
│ │ 영상 정보:                                            │  │
│ │ - 자막: "🍜 스파이시한 신메뉴가 등장했어요!"          │  │
│ │ - 해시태그: #신메뉴 #맛있다 #카페                    │  │
│ │ - 트렌드: #신메뉴                                    │  │
│ │ - 생성 시간: 2026-07-15 10:45:30                   │  │
│ │                                                        │  │
│ │ [수정 버튼] [다시 생성] [Instagram 발행] [TikTok 발행]│  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼ "Instagram 발행" 또는 "TikTok 발행" 클릭
               │
       ┌───────────────────────────────────────┐
       │ 백엔드 API 호출                        │
       │                                       │
       │ POST /api/publish                     │
       │ {                                     │
       │   "video_id": 123,                    │
       │   "platform": "instagram",            │
       │   "hashtags": "#신메뉴 #맛있다"      │  │
       │ }                                     │
       │                                       │
       │ Response: 200 OK                      │
       │ {                                     │
       │   "post_id": "inst_123456789",        │
       │   "message": "발행 완료"              │  │
       │ }                                     │
       └───────────┬───────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: 발행 완료                                           │
│                                                              │
│ ✅ Instagram에 성공적으로 발행되었습니다!                   │
│                                                              │
│ [Instagram 확인] [TikTok에도 발행] [새 영상 만들기]        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 데이터 흐름 (상세)

### **Phase 1: Setup → Dashboard 전환**

```
사용자 입력 (Setup 페이지)
├─ POST /api/stores
│  {
│    "store_name": "카페 봄",
│    "category": "카페",
│    "location": "서울 강남구"
│  }
└─ ✅ store_id: 1 반환

Supabase 저장
└─ store_info 테이블에 저장
```

---

### **Phase 2: Dashboard → Generate 전환**

```
사용자가 Dashboard에서 트렌드 확인
├─ GET /api/trends (Naver DataLab)
│  └─ [트렌드 리스트 표시]
│     #신메뉴 (검색량: 15,200)
│     #할인이벤트 (검색량: 8,900)
│     #카페 (검색량: 12,500)
│
└─ 사용자: "#신메뉴" 옆 "이 트렌드로 릴스 만들기" 클릭
   └─ Generate 페이지로 이동
      └─ URL: /generate?trend=#신메뉴
         └─ trend_hashtag="#신메뉴"을 상태에 저장
```

---

### **Phase 3: Generate 페이지 (이미지 업로드)**

```
[프론트엔드]
사용자 액션:
├─ 이미지 드래그앤드롭 또는 파일 선택
│  └─ handleFile() 실행
│
├─ 파일 검증
│  ├─ MIME 타입 확인 (image/jpeg, image/png)
│  ├─ 파일 크기 확인 (최대 10MB)
│  └─ ✅ 통과
│
└─ 업로드 (multipart/form-data)
   └─ POST /api/upload
      {
        "store_id": 1,
        "file": <image.jpg>
      }

[백엔드]
├─ 파일 검증 (다시 한 번)
├─ Supabase Storage에 저장
│  └─ /uploads/store_1/img_uuid.jpg
├─ DB에 기록
│  {
│    "image_id": 42,
│    "store_id": 1,
│    "original_filename": "product.jpg",
│    "storage_path": "/uploads/store_1/img_uuid.jpg",
│    "file_size": 2621440
│  }
└─ Response (200 OK)
   {
     "image_id": 42,
     "url": "https://storage.supabase.co/...",
     "original_filename": "product.jpg",
     "file_size": 2621440
   }

[프론트엔드]
└─ 이미지 미리보기 표시
   ✅ product.jpg
   크기: 2.5 MB
```

---

### **Phase 4: 캠페인 기획 (프로모션 목적 + 무드)**

```
사용자가 우측 패널에서:
1. 프로모션 목적 선택 (체크박스)
   ☑ 신메뉴 소개
   ☐ 할인 이벤트

2. 비디오 무드 선택 (라디오 버튼)
   ◉ 밝고 활기찬

3. "🚀 릴스 생성하기" 클릭
   └─ 상태:
      {
        "image_id": 42,
        "trend_hashtag": "#신메뉴",
        "purpose": ["신메뉴 소개"],
        "mood": "bright"
      }
```

---

### **Phase 5: AI 파이프라인 시작**

```
[프론트엔드]
POST /api/generate (multipart/form-data)
{
  "store_id": 1,
  "image_id": 42,
  "trend_hashtag": "#신메뉴",
  "purpose": "신메뉴 소개",
  "mood": "bright"
}

Response (202 Accepted)
{
  "job_id": "gen_uuid_12345",
  "status": "queued",
  "estimated_time": 45
}

[프론트엔드: Processing 페이지로 이동]
└─ job_id를 저장
└─ 폴링 시작: GET /api/generate/{job_id} (매 1초마다)

[백엔드: 파이프라인 대기열에 추가]
Supabase generation_jobs 테이블에 추가:
{
  "job_id": "gen_uuid_12345",
  "store_id": 1,
  "status": "queued",
  "current_step": 0,
  "progress": 0,
  "trend_hashtag": "#신메뉴",
  "purpose": "신메뉴 소개",
  "mood": "bright",
  "original_image_url": "https://storage.supabase.co/...",
  "created_at": "2026-07-15T10:45:00Z"
}
```

---

### **Phase 6: 실시간 진행 상황 표시 (폴링)**

```
[프론트엔드]
계속 폴링: GET /api/generate/gen_uuid_12345

[첫 번째 응답 (1초 후)]
{
  "job_id": "gen_uuid_12345",
  "status": "processing",
  "current_step": 1,
  "progress": 15,
  "steps": [
    {
      "name": "YOLOv8 스마트 크롭",
      "status": "in_progress",
      "duration": null
    },
    ...
  ]
}
└─ UI 업데이트: Step 1 진행 중, 15% 완료

[두 번째 응답 (4초 후)]
{
  "job_id": "gen_uuid_12345",
  "status": "processing",
  "current_step": 1,
  "progress": 40,
  "steps": [
    {
      "name": "YOLOv8 스마트 크롭",
      "status": "completed",
      "duration": 3.2,
      "output": {
        "image_path": "https://storage.supabase.co/cropped_uuid.png",
        "confidence": 0.95,
        "product_label": "커피 컵"
      }
    },
    {
      "name": "KoBERT 트렌드 매칭",
      "status": "in_progress",
      "duration": null
    },
    ...
  ]
}
└─ UI 업데이트: Step 1 완료 ✅, Step 2 진행 중

[세 번째 응답 (7초 후)]
{
  "status": "processing",
  "current_step": 2,
  "progress": 65,
  "steps": [
    ...,
    {
      "name": "KoBERT 트렌드 매칭",
      "status": "completed",
      "duration": 2.1,
      "output": {
        "caption": "🍜 스파이시한 신메뉴가 등장했어요!",
        "hashtags": ["#신메뉴", "#맛있다", "#카페"],
        "similarity_score": 0.87
      }
    },
    ...
  ]
}
└─ UI 업데이트: Step 2 완료 ✅, Step 3 진행 중

[최종 응답 (14초 후)]
{
  "job_id": "gen_uuid_12345",
  "status": "completed",
  "current_step": 4,
  "progress": 100,
  "steps": [
    { "name": "YOLOv8 스마트 크롭", "status": "completed", "duration": 3.2 },
    { "name": "KoBERT 트렌드 매칭", "status": "completed", "duration": 2.1 },
    { "name": "TTS 음성 생성", "status": "completed", "duration": 1.8 },
    { "name": "FFmpeg 영상 렌더링", "status": "completed", "duration": 7.4 }
  ]
}
└─ UI 업데이트: 모든 단계 완료! ✅
└─ "결과 보기" 버튼 활성화
```

---

### **Phase 7: 최종 결과 조회**

```
[프론트엔드]
GET /api/generate/gen_uuid_12345/result

Response (200 OK)
{
  "job_id": "gen_uuid_12345",
  "status": "completed",
  "video": {
    "video_id": 123,
    "video_url": "https://storage.supabase.co/videos/vid_uuid.mp4",
    "duration": 15,
    "resolution": "1080x1920",
    "file_size": 5242880,
    "thumbnail": "https://storage.supabase.co/thumbnails/vid_uuid.jpg"
  },
  "metadata": {
    "caption": "🍜 스파이시한 신메뉴가 등장했어요!",
    "hashtags": ["#신메뉴", "#맛있다", "#카페"],
    "trend": "#신메뉴",
    "purpose": "신메뉴 소개",
    "mood": "bright",
    "created_at": "2026-07-15T10:46:15Z"
  }
}

[프론트엔드]
└─ Review 페이지로 이동
└─ 영상 미리보기 표시
└─ "Instagram 발행", "TikTok 발행" 버튼 활성화
```

---

### **Phase 8: SNS 발행**

```
[프론트엔드]
사용자: "Instagram 발행" 버튼 클릭
├─ Instagram 인증 필요한가?
│  └─ YES: OAuth 로그인 페이지로 이동
│  └─ NO: 토큰 있음 → 바로 발행
│
└─ POST /api/publish
   {
     "video_id": 123,
     "store_id": 1,
     "platform": "instagram",
     "hashtags": "#신메뉴 #맛있다 #카페"
   }

[백엔드]
├─ 사용자의 Instagram Access Token 확인
├─ Instagram Graph API 호출
│  └─ POST https://graph.instagram.com/v18.0/me/media
│     {
│       "video_url": "https://storage.supabase.co/videos/vid_uuid.mp4",
│       "caption": "🍜 스파이시한 신메뉴가 등장했어요!\n\n#신메뉴 #맛있다 #카페"
│     }
│
├─ 성공: Response 200 + media_id 반환
│  └─ media_id: "123456789"
│
└─ DB 기록
   published_videos 테이블:
   {
     "video_id": 123,
     "store_id": 1,
     "platform": "instagram",
     "post_id": "inst_123456789",
     "published_at": "2026-07-15T10:46:30Z"
   }

[프론트엔드]
Response (200 OK)
{
  "success": true,
  "platform": "instagram",
  "post_id": "inst_123456789",
  "message": "Instagram에 성공적으로 발행되었습니다"
}

UI 업데이트:
✅ Instagram에 발행 완료!
[Instagram 확인하기] [TikTok에도 발행] [새 영상 만들기]
```

---

## 🎬 시간축 (타이밍)

```
시간 (초)    |  프론트엔드                      |  백엔드                        
─────────────┼──────────────────────────────────┼────────────────────────────
0            | 🚀 릴스 생성하기 클릭            |
0-1          | POST /api/generate               | Job 생성, 대기열 추가
             | Response: 202 Accepted           | generation_jobs INSERT
             | → Processing 페이지로 이동        |
             | 폴링 시작                        |
─────────────┼──────────────────────────────────┼────────────────────────────
1            | GET /api/generate/{job_id}       | Step 1 시작 (YOLOv8)
2            | 폴링 계속                         | YOLOv8 실행 중...
3            | 폴링 계속                         | Step 1 완료 ✅ (3.2초)
             |                                  |
4            | GET /api/generate/{job_id}       | Step 2 시작 (KoBERT)
             | Step 1 완료 표시                  |
5            | 폴링 계속                         | KoBERT 실행 중...
6            | 폴링 계속                         | Step 2 완료 ✅ (2.1초)
             |                                  |
7            | GET /api/generate/{job_id}       | Step 3 시작 (TTS)
             | Step 2 완료 표시                  |
8            | 폴링 계속                         | TTS 실행 중...
9            | 폴링 계속                         | Step 3 완료 ✅ (1.8초)
             |                                  |
10           | GET /api/generate/{job_id}       | Step 4 시작 (FFmpeg)
             | Step 3 완료 표시                  |
11-17        | 폴링 계속                         | FFmpeg 실행 중...
             | (사용자는 진행률 보며 대기)        |
18           | GET /api/generate/{job_id}       | Step 4 완료 ✅ (7.4초)
             | 모든 단계 완료 ✅                 | 
             | "결과 보기" 버튼 활성화            | Supabase Storage 업로드 완료
─────────────┼──────────────────────────────────┼────────────────────────────
19           | GET /api/generate/{job_id}/result| 
             | → Review 페이지로 자동 이동       | 최종 결과 반환
─────────────┼──────────────────────────────────┼────────────────────────────
20~30        | 영상 미리보기 표시                |
             | "Instagram 발행" 버튼 클릭       |
             | POST /api/publish                | Instagram API 호출
31           | Response: 200 OK                 | media_id 반환
             | ✅ Instagram 발행 완료!          | published_videos INSERT
```

---

## 📊 상태 전이도

```
┌─────────────────┐
│     Setup       │  (가게 정보 입력)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Dashboard     │  (트렌드 확인)
└────────┬────────┘
         │
         ▼ "이 트렌드로 릴스 만들기" 클릭
         │
┌─────────────────┐
│    Generate     │  (이미지 업로드 + 기획)
└────────┬────────┘
         │
         ▼ "릴스 생성하기" 클릭
         │
         POST /api/generate (202 Accepted)
         │
         ▼
┌─────────────────┐
│   Processing    │  (진행 상황 폴링)
└────────┬────────┘
         │
         ▼ 모든 단계 완료 (status: completed)
         │
┌─────────────────┐
│     Review      │  (영상 확인 + 발행)
└────────┬────────┘
         │
         ▼ "Instagram 발행" 또는 "TikTok 발행"
         │
         POST /api/publish (200 OK)
         │
         ▼
┌─────────────────┐
│   Publishing    │  (발행 완료)
└─────────────────┘
```

---

## ✅ 체크리스트

필요한 페이지:
- [ ] Setup (기존)
- [ ] Dashboard (기존)
- [ ] Generate (기존) - **수정 필요**: trend_hashtag 전달
- [ ] **Processing** (NEW) - 진행 상황 표시
- [ ] Review (기존)

필요한 API 엔드포인트:
- [ ] POST /api/generate - 파이프라인 시작
- [ ] GET /api/generate/{job_id} - 진행 상황 조회 (폴링)
- [ ] GET /api/generate/{job_id}/result - 최종 결과 조회
- [ ] POST /api/publish - SNS 발행 (기존)

필요한 데이터베이스:
- [ ] generation_jobs - 작업 추적
- [ ] generation_steps - 단계별 로깅

