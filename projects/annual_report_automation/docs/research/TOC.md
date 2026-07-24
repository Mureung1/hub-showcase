# 파일 목차 

## 세무조정계산서, 결산보고서에 관하여 내용을 리서치 시킨 후의 결과물 

D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\notes\세무조정계산서-결산보고서-research.md  

## 연간결산보고서의 내용들 
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\notes\연간결산_보고서_내용들.md , 

## 아이디어 
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\notes\IDEA.md

## 항목별 준비물·생성 워크플로우 리서치 (2026-07-15)
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\notes\보고서-준비물-워크플로우.md

## ★ 팩트체크 — 0~5단계는 정말 자동화되어 있는가 (2026-07-16)
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\notes\팩트체크-자동화-현황.md
  → PLAN.md의 전제 3개를 서브에이전트 4개로 검증한 결과: 전부 틀렸거나 과장이었음.
    "수집엔 사람 없다"(절반 틀림) / "AI 스크래핑은 열등한 재구현"(틀림 — 기존도 스크래핑) /
    "세무조정은 이미 자동화"(과장 — 더존이 2025.2에야 AI 출시)
    세무사랑Pro 조사 · 수임동의 실체 · 은행 자동화 법적 판정 · 오픈뱅킹/마이데이터 대안 포함

## 실행 계획서 — 전체 개요 (2026-07-15)
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\PLAN.md

## 기술 스택 결정 — FE/BE/DB (2026-07-16)
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\notes\기술스택-결정.md
  서브에이전트 3개 조사 종합. 결론: 급소는 언어가 아니라 "금액을 부동소수로 다루는 것".
  금액 BigInt(원단위) 전환 = 지금 · DB는 SQLite(금액 INTEGER) · BE는 JS 유지 · FE는 만들지 마라

## ★ 세무조정 엔진 — 실제 산출물 (2026-07-16~, Python)
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\README.md
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\taxengine\   ← money·domain·engine·loader·validate·cli
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\data\templates\   ← 종이책 입력 CSV 템플릿
실행: python -m unittest discover -s tests (27개) · python -m taxengine.cli.reproduce (재현 성공)
  감가상각 시부인 §5 + 별지3 세액계산 + 무결성 검증기. 금액은 Decimal. 정답지 원단위 일치.
  ※ 최초 JS로 구현 후 2026-07-16 Python 전면 이관(금액 정밀도+가독성). 결과 동일.

## 발표 자료 (2026-07-16)
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\presentation\index.html   ← 슬라이드 13장 (브라우저로 열기, S키=스크립트)
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\presentation\SCRIPT.md    ← 발표 대본 + 예상 질문 대비
  스토리: "내가 세운 전제 3개가 전부 틀렸고, 서브에이전트로 그걸 알아냈다" · 목표 7분

## 파이프라인 데모 (2026-07-16) — mock 데이터로 0~5단계 흐름 시연
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\demo\README.md
실행: cd demo && npm install && npm start → http://localhost:3100

## 단계별 상세 계획 (2026-07-15)
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\plans\PLAN-1-장부기록.md   ← ★주력 (분개 AI)
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\plans\PLAN-2-결산.md
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\plans\PLAN-3-결산보고서.md
D:\1.gemini\NAVER_AI_Challenge\projects\annual_report_automation\plans\PLAN-4-세무조정.md