# 📘 나만의 공부 사용설명서

MBTI와 공부 습관·스트레스 반응 설문을 바탕으로 사용자의 공부 성향을 분석하고, 오늘 바로 실천할 수 있는 공부 루틴과 회복 루틴을 추천하는 웹 서비스입니다.

## 🔗 프로젝트 기획서 및 문서 정보

- 상세한 문제 정의, 사용자 시나리오 및 기능 정의는 아래 Wiki에서 확인하실 수 있습니다.
- [N077_박병관 프로젝트 기획서 Wiki 바로가기](https://github.com/bricepark94/hub/wiki/%5BN077_%EB%B0%95%EB%B3%91%EA%B4%80%5D-%E2%80%90-MBTI-%EA%B8%B0%EB%B0%98-%EA%B3%B5%EB%B6%80-%EC%84%B1%ED%96%A5-%EB%B0%8F-%EC%8A%A4%ED%8A%B8%EB%A0%88%EC%8A%A4-%ED%9A%8C%EB%B3%B5-%EC%BD%94%EC%B9%AD-%EC%9B%B9%EC%95%B1-%EC%A3%BC%EC%A0%9C-%EA%B8%B0%ED%9A%8D%EC%84%9C)

## ✨ 프로젝트 소개

많은 학습자는 공부 계획을 세우지만 오래 지속하지 못하거나, 남들이 좋다고 하는 공부법을 따라 하다가 오히려 집중력 저하와 스트레스를 경험합니다.

이 프로젝트는 MBTI를 사람을 고정적으로 판단하는 도구로 사용하지 않고, 사용자의 공부 선호를 파악하는 초기 참고 지표로 활용합니다. 여기에 공부 습관 설문과 스트레스 반응 설문을 더해 사용자가 자신에게 더 편할 가능성이 있는 공부 방식과 회복 루틴을 찾도록 돕습니다.

목표는 사용자가 “더 많이 공부하는 것”이 아니라, **나에게 맞는 방식으로 더 오래 지속 가능한 공부를 하는 것**입니다.

## 🧩 핵심 기능

- MBTI 선택 또는 간단 성향 입력
- 공부 습관 설문
- 스트레스 반응 설문
- 공부 성향 지표 분석
- 추천 공부법 TOP 3 제공
- 피해야 할 공부 방식 제공
- 오늘의 20분 공부 루틴 추천
- 스트레스 회복 루틴 추천
- 공부 후 완료 여부·집중도·피로도 기록

## 🛠 기술 스택

<p>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black">
  <img src="https://img.shields.io/badge/CSS-663399?style=for-the-badge&logo=css&logoColor=white">
  <img src="https://img.shields.io/badge/localStorage-4B5563?style=for-the-badge">
</p>

## 📄 프로젝트 문서

| Docs | Description |
|---|---|
| docs/plan.md | 기획서 및 사용자 시나리오 |
| docs/checklist.md | 개발 계획 및 작업 분해 |
| README.md | 프로젝트 소개 및 실행 안내 |
| GitHub Wiki | 상세 문제 정의, 기능 정의, MVP 범위 |

## 📁 폴더 구조

```txt
hub/
  README.md
  docs/
    plan.md
    checklist.md
  src/
  public/
  package.json
  vite.config.js
```

## 🚀 실행 방법

```bash
npm install
npm run dev
```

## 🎯 MVP 범위

MVP는 성향 분석과 맞춤 루틴 추천에 집중합니다.

- MBTI 기반 초기 공부 선호 참고
- 공부 습관 및 스트레스 반응 설문
- 공부 성향 요약
- 추천 공부법과 피해야 할 공부 방식 안내
- 오늘 바로 실행할 수 있는 20분 공부 루틴 추천
- 스트레스 완화를 위한 회복 루틴 추천
- 학습 후 간단 기록 저장

## 🚫 제외 범위

- 회원가입
- 커뮤니티
- 친구 비교
- 성적 예측
- 정신건강 진단
- 결제
