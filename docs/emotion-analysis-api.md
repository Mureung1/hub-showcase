# 감정 분석 API

## 인증 경계

모든 감정 분석 API는 `X-Guest-Key` 헤더가 필요합니다. 서버는 키를
HMAC-SHA256으로 해시하고 활성 `guest_sessions` 레코드를 찾은 뒤, 해당
`guest_session_id`만 저장·조회 조건으로 사용합니다.

브라우저의 `sessionId` 쿼리나 본문 값은 서버 소유권 근거로 사용하지 않습니다.

## 분석 저장

```http
POST /api/emotion-analyses
Content-Type: application/json
X-Guest-Key: XXXX-...
```

```json
{
  "situationText": "내일 발표가 있어서 걱정돼.",
  "faceSignal": null,
  "faceSignalSource": "camera",
  "faceSignalConfidence": 0.72,
  "faceSignalEvidence": ["browDownLeft", "eyeSquintLeft"],
  "faceSignalHeuristicVersion": "v1",
  "voiceSignal": "fast",
  "selectedScenario": "tension",
  "analysisResult": {
    "scores": [],
    "possibleStates": [],
    "evidence": [],
    "responseApproach": "ask_gently",
    "needsConfirmation": true
  },
  "aiResponse": "어떤 부분이 가장 걱정되는지 하나만 말해줄래?"
}
```

성공하면 HTTP `201`과 `data.emotionAnalysis`를 반환합니다.

- 상황 입력: 최대 500자
- 카메라 evidence: 서버가 허용한 이름 최대 3개
- 분석 JSON: 최대 20KB
- AI 답변: 최대 2,000자
- 카메라 입력: `faceSignal`을 `null`로 저장
- 수동 입력: 카메라 메타데이터를 허용하지 않음

영상, 프레임, 랜드마크, 장치 정보와 전체 blendshape 점수는 요청에 포함하지
않습니다.

## 분석 기록 조회

```http
GET /api/emotion-analyses?limit=20
X-Guest-Key: XXXX-...
```

`limit`은 1~100이며 기본값은 20입니다. 인증된 게스트의 기록만 최신순으로
반환합니다.

## 오류 형식

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "situationText",
        "message": "situationText must contain at most 500 characters."
      }
    ]
  }
}
```

주요 상태:

- `400`: 입력 검증 실패
- `401`: 게스트 키 없음·만료·오류
- `429`: API 요청 제한
- `502`: Supabase 작업 실패
- `503`: 서버 필수 설정 누락

## React 연결

- 익명 모드는 이 API를 호출하지 않고 `sessionStorage`를 사용합니다.
- 게스트 모드만 same-origin `/api`로 저장·조회합니다.
- `X-Guest-Key`는 API 모듈 내부에서만 추가합니다.
- 키를 URL, 본문, 로그 또는 오류 문구에 넣지 않습니다.

