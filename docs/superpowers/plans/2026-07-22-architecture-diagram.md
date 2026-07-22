# 서비스 아키텍처 다이어그램 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 현재 구현된 아맞다의 저장·보관함·꺼내보기 데이터 흐름을 독립 HTML과 PR 본문용 PNG 한 장으로 제공한다.

**Architecture:** docs/architecture.html을 시각 자료의 단일 원본으로 두고 HTML·CSS·SVG를 한 파일 안에 작성한다. Windows Edge의 headless 캡처로 동일 문서를 PNG로 렌더링하며 제품 소스와 빌드 설정은 변경하지 않는다.

**Tech Stack:** 정적 HTML5, CSS, 인라인 SVG, Microsoft Edge headless 캡처

---

## 파일 구조

- 생성: docs/architecture.html — 의미 있는 섹션, 카드, 화살표와 모든 스타일을 포함한 단일 원본
- 생성: docs/assets/amadda-architecture.png — HTML을 1600px 와이드 화면으로 렌더링한 PR 본문용 이미지
- 수정: docs/superpowers/plans/2026-07-22-architecture-diagram.md — 실행 체크와 최종 검증 결과 기록

제품 런타임, API, 데이터베이스, Android, Chrome 확장 파일은 수정하지 않는다.

### Task 1: 독립 아키텍처 HTML 작성

**Files:**

- Create: docs/architecture.html
- Reference: docs/superpowers/specs/2026-07-22-architecture-diagram-design.md
- Reference: DESIGN.md
- Reference: server/supabase_insight_capture.ts
- Reference: server/supabase_insight_memo.ts
- Reference: src/entities/insight/model/retrieve_insights.ts

- [x] **Step 1: 산출물 부재를 확인한다**

Run:

    node -e "const fs=require('fs'); if(!fs.existsSync('docs/architecture.html')) process.exit(1)"

Expected: 종료 코드 1. 아직 HTML 원본이 없다.

- [x] **Step 2: 의미 구조와 시각 토큰을 포함한 HTML을 작성한다**

문서는 다음 정확한 의미 구조를 사용한다.

    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>아맞다 서비스 아키텍처</title>
        <style>
          :root {
            --canvas: #ffffff;
            --paper: #f7f8fa;
            --ink: #111318;
            --muted: #626a76;
            --line: #dfe3e8;
            --blue: #0560fd;
            --amber: #ffb000;
            --radius: 18px;
          }
          * { box-sizing: border-box; }
          body { margin: 0; background: var(--canvas); color: var(--ink); }
          .canvas { width: 1600px; min-height: 1000px; margin: 0 auto; padding: 64px 72px; }
          .architecture-grid {
            display: grid;
            grid-template-columns: 320px 1fr 360px;
            gap: 28px;
          }
          .card {
            border: 1px solid var(--line);
            border-radius: var(--radius);
            background: var(--canvas);
          }
          @media (max-width: 900px) {
            .canvas { width: 100%; min-height: auto; padding: 32px 20px; }
            .architecture-grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <main class="canvas" aria-labelledby="architecture-title">
          <header>
            <p>AMADDA · SERVICE ARCHITECTURE</p>
            <h1 id="architecture-title">저장한 링크를 지금 필요한 인사이트로</h1>
          </header>
          <section class="architecture-grid" aria-label="저장 아키텍처">
            <section aria-labelledby="entry-title">
              <h2 id="entry-title">저장 진입점</h2>
              <article class="card">웹 · URL 직접 입력</article>
              <article class="card">Chrome 확장 · 현재 페이지 저장</article>
              <article class="card">Android · ACTION_SEND → Capacitor</article>
            </section>
            <section aria-labelledby="app-title">
              <h2 id="app-title">React/Vite + Vercel Express</h2>
              <article class="card">POST /api/insights/capture</article>
              <ol class="card">
                <li>액세스 토큰 검증</li>
                <li>URL 검증·정규화</li>
                <li>사용자별 동일 URL 중복 확인</li>
                <li>인사이트 우선 저장</li>
              </ol>
              <article class="card">PATCH /api/insights/:insightId/memo</article>
            </section>
            <section aria-labelledby="storage-title">
              <h2 id="storage-title">Supabase</h2>
              <article class="card">Auth · 사용자 인증과 액세스 토큰</article>
              <article class="card">Postgres · public.insights</article>
              <article class="card">RLS · 본인의 행만 접근</article>
            </section>
          </section>
          <section aria-labelledby="retrieve-title">
            <h2 id="retrieve-title">저장한 인사이트를 다시 쓰는 흐름</h2>
            <article class="card">보관함 · 조회·메모 수정·삭제·원문 열기</article>
            <article class="card">꺼내보기 · 상황 토큰과 저장 필드 비교</article>
            <article class="card">메모 4 · 제목 3 · 카테고리 2 · 도메인 1</article>
            <article class="card">점수순 상위 6개 · 원래 URL 열기</article>
          </section>
        </main>
      </body>
    </html>

위 뼈대에 승인된 A형 시안의 헤더, 구획 라벨, 인라인 SVG 화살표, 카드 내부 설명, 저장 경로와 읽기 경로 범례를 완성한다. 화살표에는 저장, 메모 갱신, 본인 데이터 조회 라벨을 붙이고 색상만으로 경로를 구분하지 않는다. iOS, AI 추천, 메타데이터 수집은 추가하지 않는다.

- [x] **Step 3: 필수 계약을 정적으로 검사한다**

Run:

    $html = Get-Content -Raw -Encoding utf8 'docs/architecture.html'
    $required = @('lang="ko"','POST /api/insights/capture','PATCH /api/insights/:insightId/memo','public.insights','RLS','메모 4','제목 3','카테고리 2','도메인 1','상위 6개')
    $forbidden = @('iOS','AI 추천','메타데이터 수집')
    foreach ($value in $required) { if (-not $html.Contains($value)) { throw "필수 문구 누락: $value" } }
    foreach ($value in $forbidden) { if ($html.Contains($value)) { throw "금지 문구 포함: $value" } }

Expected: 종료 코드 0, 출력 없음.

- [x] **Step 4: 문서 포맷과 Git 공백 검사를 실행한다**

Run:

    npx prettier --check docs/architecture.html
    git diff --check

Expected: Prettier 통과, 공백 오류 없음.

- [x] **Step 5: HTML 원본을 커밋한다**

  git add docs/architecture.html
  git commit -m "docs: 서비스 아키텍처 다이어그램 추가"

### Task 2: PR 본문용 PNG 생성과 시각 검수

**Files:**

- Create: docs/assets/amadda-architecture.png
- Verify: docs/architecture.html

- [x] **Step 1: Edge headless로 HTML 원본을 PNG로 렌더링한다**

Run:

    $edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
    $html = (Resolve-Path 'docs/architecture.html').Path.Replace('\', '/')
    $png = Join-Path (Resolve-Path 'docs/assets').Path 'amadda-architecture.png'
    & $edge --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1600,1100 --screenshot=$png "file:///$html"

Expected: docs/assets/amadda-architecture.png 생성, Edge 종료 코드 0.

- [x] **Step 2: PNG 형식과 실제 크기를 검사한다**

Run:

    Add-Type -AssemblyName System.Drawing
    $image = [System.Drawing.Image]::FromFile((Resolve-Path 'docs/assets/amadda-architecture.png'))
    try {
      if ($image.Width -ne 1600 -or $image.Height -ne 1100) {
        throw "예상하지 않은 이미지 크기: $($image.Width)x$($image.Height)"
      }
    } finally {
      $image.Dispose()
    }

Expected: 종료 코드 0, 이미지 크기 1600×1100.

- [x] **Step 3: 원본 크기로 PNG를 열어 시각 검수한다**

검수 항목:

- 한글이 깨지거나 잘리지 않는다.
- 세 열의 중심과 카드 간격이 승인된 A형 시안과 일치한다.
- 화살표가 카드·문구를 가리지 않는다.
- 저장 경로와 조회 경로가 색상 외의 라벨로도 구분된다.
- 하단 콘텐츠가 1100px 캔버스 안에서 잘리지 않는다.
- iOS, AI 추천, 미구현 메타데이터가 표시되지 않는다.

- [x] **Step 4: 좁은 화면의 DOM 순서와 넘침을 검사한다**

브라우저 너비 390px에서 저장 진입점 → 애플리케이션/API → Supabase → 보관함/꺼내보기 순서로 세로 배치되는지 확인한다. 가로 스크롤과 겹침이 없어야 한다.

- [x] **Step 5: PNG를 커밋한다**

  git add docs/assets/amadda-architecture.png
  git commit -m "docs: PR용 아키텍처 이미지 추가"

### Task 3: 소스 정합성과 최종 변경 범위 검증

**Files:**

- Verify: docs/architecture.html
- Verify: docs/assets/amadda-architecture.png
- Modify: docs/superpowers/plans/2026-07-22-architecture-diagram.md

- [x] **Step 1: 현재 구현과 다이어그램 문구를 대조한다**

Run:

    rg -n "api/insights/capture|api/insights/:id/memo" server src
    rg -n "memo: 4|title: 3|category: 2|domain: 1|slice\(0, 6\)" src/entities/insight
    rg -n "public\.insights|row level security|RLS" supabase server docs

Expected: HTML의 API 경로, 검색 가중치, 최대 결과 수, 저장 테이블과 RLS 설명이 실제 소스와 일치한다.

- [x] **Step 2: 변경 범위를 확인한다**

Run:

    git status --short
    git diff main...HEAD --name-only
    git diff --check

Expected: 설계·계획 문서, docs/architecture.html, docs/assets/amadda-architecture.png만 변경된다.

- [x] **Step 3: 계획 체크 상태와 검증 결과를 갱신한다**

완료한 모든 체크박스를 완료 상태로 바꾸고 실제 PNG 크기, 시각 검수 결과, 전체 테스트 기준선의 CRLF 실패 1건을 마지막에 기록한다. 미완료 항목을 완료로 바꾸지 않는다.

- [x] **Step 4: 최종 문서 변경을 커밋한다**

  git add docs/superpowers/plans/2026-07-22-architecture-diagram.md
  git commit -m "docs: 아키텍처 다이어그램 검증 결과 기록"

## 실행 결과

- 독립 HTML 계약: 필수 문구, 금지 문구, 외부 자산·스크립트 부재 확인
- 소스 정합성: 메모 API의 실제 경로인 `PATCH /api/insights/:insightId/memo`로 문서 정정
- PNG: `1600×1100`, 185,287바이트, 한글·카드·화살표·하단 콘텐츠 잘림 없음
- 390px 반응형: 문서 가로 넘침 0건, 저장·꺼내보기 1열 전환, DOM 순서 정상
- 포맷과 공백: Prettier 및 `git diff --check` 통과
- 전체 테스트 기준선: 520개 중 519개 통과, Windows CRLF로 기존 검사 1건 실패
