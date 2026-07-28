---
description: GitHub 인기 저장소 요약 페이지 구현 (Ollama + LLM)
tags: [github, llm, frontend, backend, integration]
---

# GitHub 인기 저장소 요약 페이지 구현

## 개요

매달 GitHub의 인기 저장소들을 자동으로 수집하고, **로컬 LLM으로 한국어 요약**을 생성한 후, 
대시보드에 보여주는 독립적인 서비스를 구현합니다.

**핵심 특징:**
- ✅ Ollama (로컬 LLM) + LLM모델(Qwen2.5, llama3.1 등)로 영어 README를 한국어로 요약
- ✅ LLM 제공자 쉽게 전환 가능 (Ollama → Claude → LlamaCPP 등)
- ✅ 기존 Posting/Eligibility 스키마와 완전히 분리
- ✅ 프로덕션 배포 가능한 구조

---

## Phase 1: 환경 준비

### 1-1. Ollama 설치

**목표:** 로컬 LLM 서버 (Ollama) 설치 및 Qwen2.5 7B 모델 준비

**단계:**

```bash
# 1. Mac M2용 Ollama 다운로드
# https://ollama.ai 에서 macOS 버전 다운로드
# (또는 Homebrew: brew install ollama)

# 2. Ollama 실행 (백그라운드)
ollama serve

# 3. 다른 터미널에서 Qwen2.5 7B 다운로드 (첫 실행 시 3-5분)
ollama pull qwen2.5:7b

# 4. 모델 확인
curl http://localhost:11434/api/tags
```

**메모리 사용:**
- Qwen2.5 7B: ~8GB RAM
- M2 16GB에서 충분함

**확인:**
```bash
# Ollama API 테스트
curl http://localhost:11434/api/generate \
  -d '{
    "model": "qwen2.5:7b",
    "prompt": "안녕하세요",
    "stream": false
  }'
```

---

### 1-2. .env 확인

**목표:** 백엔드에서 Ollama와 통신 가능하도록 설정 확인

**확인사항:**
```bash
cd backend

# .env 파일 확인
cat .env | grep -A 3 "LLM_PROVIDER"

# 다음 항목들이 있는지 확인:
# LLM_PROVIDER="ollama"
# OLLAMA_BASE_URL="http://localhost:11434"
# OLLAMA_MODEL="qwen2.5:7b"
```

**이미 설정되어 있으니 확인만 하면 됨**

---

### 1-3. 백엔드 서버 시작

**목표:** 백엔드 서버 실행 및 새 GitHub API 엔드포인트 확인

```bash
cd backend

# 서버 시작
npm run dev

# 다른 터미널에서 확인
curl http://localhost:3000/health
```

**기대 결과:**
```
🚀 서버 시작: http://localhost:3000
🤖 LLM Service initialized: ollama (qwen2.5:7b)
```

---

### 1-4. GitHub API 토큰 설정 (선택)

**목표:** GitHub API Rate Limit 상향 (60/hr → 1000/hr)

**선택사항:**
```bash
# .env에 추가 (GitHub 토큰이 없어도 작동하지만 rate limit 낮음)
GITHUB_TOKEN="ghp_your_token_here"

# 토큰 생성:
# https://github.com/settings/tokens
# - Permissions: public_repo (읽기 전용)
```

---

## Phase 1 검증 체크리스트

- [ ] Ollama 실행 중 (localhost:11434)
- [ ] Qwen2.5 7B 모델 다운로드 완료
- [ ] 백엔드 서버 실행 중 (localhost:3000)
- [ ] LLM Service 초기화 로그 확인
- [ ] curl 테스트 성공
- [ ] .env 설정 확인
- [ ] (선택) GitHub 토큰 설정

---

## Phase 1 완료 후

✅ Phase 1 완료 → **Phase 2: 프론트엔드 페이지 구현**으로 이동

---

## 참고: LLM 제공자 전환 방법

만약 Ollama 대신 다른 LLM을 사용하고 싶다면:

```bash
# .env에서 한 줄만 변경
LLM_PROVIDER="claude"  # 또는 "llamacpp", "openai"

# 각 제공자별 환경변수 설정 (CLAUDE.md 참고)
```

**새 제공자 추가하기:**
1. `backend/src/services/llmService.ts`에서 `callYourProvider()` 메서드 추가
2. switch문에 케이스 추가
3. 끝!

---

## 트러블슈팅

### Ollama 실행 안 됨
```bash
# 설치 확인
which ollama

# 없으면 다시 설치
brew install ollama
# 또는 https://ollama.ai에서 다운로드
```

### Qwen2.5 모델 다운로드 중단
```bash
# 다시 시도
ollama pull qwen2.5:7b

# 진행률 확인
# 약 4.7GB 파일 다운로드
```

### 백엔드에서 Ollama 연결 불가
```bash
# Ollama 실행 중인지 확인
curl http://localhost:11434/api/tags

# 포트 확인
lsof -i :11434

# 방화벽 확인 (localhost는 보통 문제 없음)
```

---

## 다음 단계

✅ Phase 1: 환경 준비 완료

👉 Phase 2: 프론트엔드 페이지 구현
   - GithubReposPage.tsx
   - RepoCard.tsx
   - githubApi.ts
