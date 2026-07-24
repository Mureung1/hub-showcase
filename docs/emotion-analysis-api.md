# Emotion Analysis API

## Base route

```text
/api/emotion-analyses
```

All request and response field names use `camelCase`. The server maps them to the Supabase
`snake_case` columns.

## Create an analysis

```http
POST /api/emotion-analyses
Content-Type: application/json
```

```json
{
  "sessionId": "7d7e3d50-c7a8-4d36-85fa-6a4dceca1077",
  "situationText": "I have an important presentation tomorrow.",
  "faceSignal": null,
  "faceSignalSource": "camera",
  "faceSignalConfidence": 0.72,
  "faceSignalEvidence": [
    "browDownLeft",
    "eyeSquintLeft"
  ],
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
  "aiResponse": "Tell me which part concerns you the most."
}
```

A successful request returns HTTP `201` and the stored record as
`data.emotionAnalysis`.

`faceSignalSource` defaults to `manual` for older clients. Manual input must not include camera
metadata. Camera input must include a confidence value between 0 and 1 and a heuristic version.
`faceSignalEvidence` accepts at most three server-approved blendshape feature names.
Manual input requires one allowed `faceSignal`. Camera input stores `faceSignal` as `null`; when an
older client sends a legacy camera value, the server discards it before persistence.

The confidence value is a prototype expression-signal similarity, not an emotion probability or a
medical assessment.

The client never sends webcam video, image frames, facial landmark coordinates, camera device
information, or the full blendshape result to this API.

## List analyses for a session

```http
GET /api/emotion-analyses?sessionId=7d7e3d50-c7a8-4d36-85fa-6a4dceca1077&limit=20
```

`sessionId` is required. `limit` is optional and must be an integer between 1 and 100. The default
is 20. Records are returned newest first in `data.emotionAnalyses`.

## Error format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "sessionId",
        "message": "sessionId must be a valid UUID."
      }
    ]
  }
}
```

## Verification

Start the Express server, then run:

```bash
npm run test:api
```

The verification script inserts one clearly labeled test record and confirms that the GET route can
retrieve it.

## React integration

The React client stores a browser-specific UUID in local storage. On startup, it requests the latest
20 records for that session and restores the newest analysis result and conversation history. A new
analysis is displayed only after the POST request has stored it successfully.

Set `VITE_API_BASE_URL` when the Express API does not run at the default
`http://127.0.0.1:3000` address. This variable contains only the public API address. Supabase secret
keys must never use the `VITE_` prefix.
