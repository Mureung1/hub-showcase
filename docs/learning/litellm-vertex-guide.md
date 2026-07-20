# LiteLLM + Vertex AI 실행 방법

현재 구조는 아래 순서로 연결된다.

```text
React → Express → LiteLLM(로컬 4000번) → Vertex Gemini
```

LiteLLM이 꺼져 있거나 Vertex 호출이 실패하면 Express가 기존 mock 결과를 반환한다.

## 1. LiteLLM 실행

PowerShell 터미널을 하나 열고 아래 명령을 실행한다.

```powershell
cd C:\Users\GOM\Desktop\ict-trading-wiki
$env:PYTHONIOENCODING='utf-8'
$env:PYTHONUTF8='1'
litellm --config litellm_config.yaml --port 4000
```

`Uvicorn running on http://0.0.0.0:4000`이 보이면 준비된 상태다.

Vertex 인증은 기존 Google Application Default Credentials를 사용한다. 인증이 만료됐다면 아래 명령으로 다시 로그인한다.

```powershell
gcloud auth application-default login
```

## 2. 하루 체크아웃 실행

다른 PowerShell 터미널을 열고 실행한다.

```powershell
cd C:\Users\GOM\Desktop\naveragentai\hub
npm run dev
```

브라우저에서 `http://localhost:5173`을 연다.

## 3. 화면에서 확인

- 실제 호출 성공: `Vertex AI로 정리됨`
- 프록시 중단 또는 AI 오류: `mock 결과로 정리됨`

## 주요 환경변수

환경변수 값은 `server/.env`에만 두고 Git에 커밋하지 않는다.

- `AI_BASE_URL`: LiteLLM의 OpenAI 호환 API 주소
- `AI_API_KEY`: 로컬 LiteLLM 프록시 인증값
- `AI_MODEL`: LiteLLM 설정에 등록된 모델 이름
- `AI_TIMEOUT_MS`: AI 요청 제한 시간
- `AI_GENERATION_RETRIES`: 잘못된 응답 재시도 횟수
- `AI_MAX_TOKENS`: Gemini 사고 토큰을 포함한 최대 출력 토큰
