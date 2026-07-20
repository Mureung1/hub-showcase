# hub
#데모발표 자료
https://docs.google.com/presentation/d/17vEP-xWjFfviHcAl_nzCyjVUmIHb9qRV/edit?usp=sharing&ouid=100790024314221882298&rtpof=true&sd=true
#위키링크
https://github.com/dabinnida/hub/wiki
# 2주차 주간 계획 노션(3주차 수정 중)
https://app.notion.com/p/2-39cd247dcc5480258a2ac59d134c8a29

# about-me
# AI Life Review - 기획 및 기술 설계

## 📌 프로젝트 방향 구체화

오늘은 서비스의 핵심 컨셉과 전체 시스템 구조를 중심으로 기획을 진행했습니다.

기록의 중요성은 커지고 있지만, 많은 사용자는 일기를 꾸준히 작성하지 못합니다. 반면 ChatGPT와의 대화에는 고민, 목표, 계획, 성취 등 개인의 삶이 자연스럽게 기록됩니다.

이를 바탕으로 **ChatGPT 대화를 분석하여 사용자의 성장 과정을 자동으로 회고해주는 AI 웹 서비스**를 프로젝트 주제로 선정했습니다.

---

## 🎯 서비스 목표

* ChatGPT 대화를 기반으로 개인 성장 리포트 제공
* 사용자의 감정, 목표, 주요 이벤트를 자동 분석
* 월별·분기별 성장 과정 시각화
* 기록을 강요하지 않는 AI 기반 회고 서비스 구현

---

## 💡 핵심 아이디어

단순히 대화를 요약하는 것이 아니라,

사용자의 대화를 **Life Event** 단위로 구조화하여 성장 스토리를 생성하는 서비스를 목표로 합니다.

예시 이벤트

* 프로젝트 시작
* 여행
* 목표 설정
* 목표 달성
* 건강 이슈
* 학습
* 성취

이벤트를 시간순으로 연결하여 사용자의 변화와 성장 과정을 한눈에 확인할 수 있도록 기획했습니다.

---

## 🎨 디자인 방향

### Design Concept

**Digital Growth Journal**

### Reference

* Apple Health
* Spotify Wrapped
* Notion
* Arc Browser

### Keywords

* Minimal
* Storytelling
* Timeline
* Premium
* Calm
* Clean

대시보드 중심의 서비스가 아니라 하나의 성장 기록을 읽는 경험을 제공하는 UI를 목표로 합니다.

---

## 🛠 기술 스택(예정)

### Front-End

* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Framer Motion

### Back-End

* Next.js
* Prisma
* PostgreSQL

### AI

* OpenAI API
* LLM 기반 대화 분석
* JSON 구조 정보 추출

---

## 📂 활용 데이터

ChatGPT 대화를 기반으로 다음 정보를 추출할 예정입니다.

* 대화 내용
* 날짜 및 시간
* 감정
* 목표
* 고민
* 성취
* 주요 이벤트
* 관심사 변화

---

## ⚙ AI 분석 파이프라인

```text
ChatGPT Conversation

↓

Preprocessing

↓

LLM Analysis

↓

Event Extractor

↓

Memory Database

↓

Insight Generator

↓

Monthly Report

↓

Visualization
```

### 단계별 역할

* **Preprocessing** : 대화 전처리 및 분석 가능한 형태로 변환
* **LLM Analysis** : 대화의 의미와 맥락 분석
* **Event Extractor** : 감정, 목표, 성취, 프로젝트, 여행 등 주요 이벤트 추출
* **Memory Database** : 분석 결과 저장 및 관리
* **Insight Generator** : 성장 패턴 및 변화 분석
* **Monthly Report** : 월간 회고 생성
* **Visualization** : Dashboard 및 Timeline 형태로 시각화

---

## 📅 다음 계획

* User Flow 작성
* Service Flow 설계
* Information Architecture(IA) 작성
* Event 분류 체계 정의
* Database Schema 설계
* Wireframe 제작
* React 프로젝트 초기 환경 구성
