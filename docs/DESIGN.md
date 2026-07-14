# IRIS DESIGN.md

> Discord 기반 대학 공지 알림 서비스의 UI/UX 디자인 시스템 및 화면 설계 문서

---

# Quick Reference

- 랜딩 구현: Product Identity, Reference Images, Visual Principles, Color System, Typography, Layout System, Components, S1 Landing 참고 + `docs/image/design/landing2.png`
- 사이트 등록 화면: Visual Principles, Color System, Typography, Layout System, Components, S2 관리자 페이지 참고 + `docs/image/design/register-site.png`
- 카테고리 설정 화면: Visual Principles, Color System, Typography, Layout System, Components, S3 관리자 페이지 참고 + `docs/image/design/select-category.png`
- 설정 완료 화면: Visual Principles, Color System, Typography, Components, S4 설정 완료 참고 + `docs/image/design/select-complete.png`
- Discord Preview: Visual Principles, Color System의 Discord Dark, Components, S5/S6/S7 Discord 참고
- 반응형 작업: Layout System, Responsive 참고
- 접근성 점검: Accessibility 참고

---

# Table of Contents

1. Product Identity
2. Reference Images
3. Visual Principles
4. Color System
5. Typography
6. Layout System
7. Radius & Elevation
8. Components
9. Page Structure
10. Navigation
11. Motion
12. Responsive
13. Accessibility
14. Do / Don't
15. Example Prompt for AI Coding Agent
16. Suggested Component Names
17. Final Direction

---

# 1. Product Identity

IRIS는 대학 공지를 자동으로 확인하고 Discord에서 필요한 공지만 빠르게 받아볼 수 있도록 돕는 서비스입니다.

관리자는 공지 사이트와 CSS Selector를 등록하고, 감지된 카테고리를 Discord 채널 및 Role과 연결합니다.

사용자는 Discord 슬래시 명령어로 카테고리 구독과 키워드 알림을 직접 관리합니다.

핵심 키워드

- Discord Native
- University Notice
- Simple Setup
- Category Subscription
- Keyword DM
- Admin Friendly

---

# 2. Reference Images

구현 시 아래 레퍼런스 이미지를 함께 확인한다.

- `docs/image/design/landing2.png`
- `docs/image/design/landing.png`
- `docs/image/design/register-site.png`
- `docs/image/design/select-category.png`
- `docs/image/design/select-complete.png`

DESIGN.md의 텍스트 규칙을 우선 기준으로 삼되, 실제 화면 구성과 시각적 밀도는 위 이미지를 참고한다.
랜딩은 `landing2.png`를 우선 기준으로 하고, `landing.png`는 이전 레퍼런스로만 참고한다.

---

# 3. Visual Principles

디자인 원칙

① Discord와 자연스럽게 연결되는 경험

랜딩과 관리자 화면은 밝고 깨끗한 UI를 사용하되, Discord 미리보기 영역은 Discord Dark Theme을 유지한다.

---

② 관리자는 단계적으로 설정한다.

관리자 흐름은 복잡한 설정을 한 번에 보여주지 않고 다음 순서로 진행한다.

Site 등록

↓

Selector 설정

↓

Category 설정

↓

완료

---

③ Guide는 설정 화면 옆에 유지한다.

사이트 등록, 카테고리 설정, 설정 완료 화면에서는 우측 Guide Panel을 통해 현재 단계의 작업 기준을 안내한다.

사이트 등록과 카테고리 설정 화면은 데스크톱에서 가운데 Main 영역만 내부 스크롤되며, 사용자가 하단 내용을 확인할 때도 좌측 Sidebar와 우측 Guide Panel을 계속 볼 수 있어야 한다.

---

④ 기능은 Card와 Table 중심으로 표현한다.

서비스 기능 소개는 Feature Card로, 설정 데이터는 Preview Box와 Table Card로 표현한다.

---

⑤ 사용자는 Discord 명령어로 조작한다.

/help, /subscribe, /keyword 화면은 실제 Discord 사용 흐름을 미리 볼 수 있도록 Dark UI 안에 Bot Card 형태로 표현한다.

---

# 4. Color System

Primary

IRIS Purple

- #5b45f5
- #7c3aed
- #4f46e5
- #5865f2

Secondary

White

- #ffffff

Background

- Page Background: #f6f8ff
- Card Background: #ffffff
- Soft Card Background: #fbfdff
- Landing Feature Card Background: #f5f5fd
- Icon Background: #f0efff

Text

- Primary Text: #111827
- Body Text: #374151
- Muted Text: #64748b
- Label Text: #475569

Border

- Page Border: #dfe5f3
- Light Border: #e8edf8
- Input Border: #dbe3f0
- Card Border: #e0e7f3

Success

- Success Green: #16a34a
- Discord Checkbox Green: #22c55e

Warning / Tip

- Tip Background: #fff7ed
- Tip Text: #9a3412

Discord Dark

- Discord Window: #111827
- Discord Sidebar: #0b1220
- Bot Card: rgba(30, 41, 59, 0.86)
- Discord Text: #e5e7eb

---

# 5. Typography

Font

Inter, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif

Title

- Landing H1: 40px ~ 64px, line-height 1.15, weight 900
- Admin H2: 28px, weight 800~900
- Section H3: 18px, weight 800
- Discord Panel H2: 22px

Body

- Landing Description: 18px, line-height 1.8
- Default Body: 14px ~ 16px
- Guide Text: 14px, line-height 1.8

Caption

- Table Header: 13px
- Flow Summary Caption: 12px

Button

- 14px ~ 16px
- font-weight 800

---

# 6. Layout System

Prototype Container

- max width: 1500px
- horizontal margin: auto
- horizontal padding: 20px 기준
- vertical padding: 28px 0 48px

Landing

Header

Hero

Feature Grid

---

관리자 페이지

┌────────────┬────────────────────┬──────────────┐
│ Sidebar    │ Main               │ Guide        │
└────────────┴────────────────────┴──────────────┘

- Sidebar: 180px
- Main: flexible
- Guide Panel: 260px
- Admin page min-height: 620px
- Site 등록 / Category 설정 화면 높이: viewport 기준 고정 높이
- Site 등록 / Category 설정 Main: vertical internal scroll
- Sidebar / Guide Panel: Main 스크롤 중에도 같은 화면 안에 유지

---

Discord Preview

┌──────────────────────────────────────────────┐
│ Discord Panel Grid                           │
│ /help        /subscribe        /keyword      │
└──────────────────────────────────────────────┘

- Desktop: 3 columns
- Discord Window: 150px sidebar + flexible chat
- Window height: 500px

---

Responsive

1100px 이하에서는 Landing, Admin, Discord, Feature Grid가 1 column으로 전환된다.

---

# 7. Radius & Elevation

Page

- Radius: 22px
- Border: 1px solid #dfe5f3
- Shadow: 0 18px 50px rgba(35, 48, 90, 0.08)

Button

- Radius: 12px
- Primary Shadow: 0 12px 22px rgba(91, 69, 245, 0.22)

Card

- Feature Card Radius: 18px
- Preview / Table / Command Card Radius: 16px
- Flow Item Radius: 14px

Input

- Radius: 10px
- Height: 42px

Toggle

- Track Radius: 999px
- Size: 44px x 24px

Discord Window

- Radius: 18px
- Shadow: 0 18px 50px rgba(15, 23, 42, 0.22)

---

# 8. Components

Header

Brand

Primary Button

Secondary Button

Link Button

Hero Section

Hero Illustration

Feature Card

Sidebar

Side Item

Guide Panel

Form Section

Selector Row

Input

Select

Preview Box

Table Card

Toggle

Notice Box

Success Check Circle

Command List

Discord Window

Discord Sidebar

Bot Card

Discord Button

Dark Button

Flow Summary

---

# 9. Page Structure

## S1 Landing

목적

서비스 소개 및 Discord 봇 초대 유도

Reference

랜딩 화면은 `docs/image/design/landing2.png`를 기준으로 구현한다.

Header

IRIS Logo

랜딩 Header는 브랜드만 표시하며, 우측 메뉴와 관리자 시작 버튼은 배치하지 않는다.

Hero

좌측

Eyebrow

Discord University Notice Service

Headline

필요한 대학 공지를 Discord에서 더 편하게

Description

Iris는 대학 공지를 자동으로 확인하고, 카테고리 알림과 키워드 DM으로 필요한 공지만 빠르게 받아볼 수 있도록 돕는다.

Button

Discord 봇 초대하기

시작 가이드 보기

우측

IRIS Hero Illustration

Feature

실시간 공지 알림

카테고리 알림

키워드 알림

('/') 슬래시 명령어

시작 가이드 동작

- 시작 가이드 보기 버튼은 별도 페이지나 모달을 열지 않는다.
- 버튼을 누르면 Feature Card 영역의 내용을 시작 가이드 단계로 전환한다.
- 전환 후 버튼 문구는 `기능 소개`로 변경한다.
- `기능 소개` 버튼을 누르면 Feature Card 영역을 다시 기능 소개 카드로 되돌리고 버튼 문구를 `시작 가이드`로 변경한다.
- 기능 소개와 시작 가이드는 동시에 표시하지 않는다.

시작 가이드 카드

1. 봇 초대하기
   - Step Number: 01
   - Description: 랜딩의 Discord 봇 초대하기 버튼으로 IRIS Bot을 서버에 추가한다.
2. 권한 승인
   - Step Number: 02
   - Description: Discord 안내에 따라 서버와 Bot 권한을 확인하고 초대를 완료한다.
3. /setup 입력
   - Step Number: 03
   - Description: 봇을 초대한 서버에서 관리자 권한으로 /setup 명령어를 입력한다.
4. 관리자 페이지 접속
   - Step Number: 04
   - Description: IRIS Bot이 보내준 링크로 관리자 설정 페이지에 접속한다.

Feature / Guide Card Visual

- Feature Card는 `landing2.png`처럼 연한 보라색 배경(`#f5f5fd`)을 사용한다.
- Feature Card 안의 기능 아이콘은 원형 아이콘 배경(`#f0efff`) 위에 배치한다.
- 시작 가이드 카드에서는 기능 아이콘 대신 `01`, `02`, `03`, `04` 숫자 배지를 사용한다.
- 숫자 배지는 보라색 포인트를 사용하되, 카드 전체 톤은 Feature Card와 같은 `#f5f5fd` 계열을 유지한다.
- 카드의 높이, border, radius, spacing은 기능 소개 카드와 동일하게 유지해 토글 시 레이아웃이 흔들리지 않게 한다.

Discord 봇 초대하기 버튼

- Discord OAuth Bot 초대 링크로 이동한다.
- 실제 초대 링크가 준비되지 않은 개발 단계에서는 준비 중 안내를 표시할 수 있다.

---

## S2 관리자 페이지

사이트 등록

목적

공지 사이트 정보와 크롤링 Selector를 등록한다.

좌측

Sidebar

사이트 등록

카테고리 설정

Main

사이트 이름

공지 사이트 URL

입력란은 실제 값이 채워진 상태가 아니라 placeholder 예시로 표시한다.

- 예: 경북대학교 컴퓨터학부
- 예: https://cse.knu.ac.kr/board/notice

Selector 설정

- 목록 Selector (list)
- 제목 Selector (title)
- 링크 Selector (link)
- 날짜 Selector (date)
- 카테고리 Selector (category)

Selector 입력란은 실제 값이 채워진 상태가 아니라 placeholder 예시로 표시한다.

- 예: ul.notice-list > li
- 예: .title
- 예: a.link
- 예: .date
- 예: .category

Action

테스트 크롤링

Preview

최근 공지 미리보기

Helper

Selector 설정 제목 오른쪽에 배치한다.

문구: 도움이 필요하신가요?

설정 방법

개발자에게 요청하기: Primary Button 스타일

Next

다음

Guide

공지 사이트 URL 입력

Selector 입력

테스트 크롤링 확인

스크롤

Main 영역만 세로 스크롤되며 Sidebar와 Guide는 화면에 유지된다.

---

## S3 관리자 페이지

카테고리 설정

목적

감지된 카테고리별 Discord 채널, Role 이름, 활성화 여부를 설정한다.

Table

카테고리

채널

Role 이름

활성화

기본 Role 규칙

Iris-{카테고리명}

Role 이름 입력란은 실제 값이 채워진 상태가 아니라 placeholder 예시로 표시한다.

예시

예: Iris-학사공지

예: Iris-장학공지

예: Iris-취업공지

예: Iris-행사공지

예: Iris-기타공지

활성화 규칙

활성화 ON인 카테고리만 알림 전송 대상이 된다.

활성화 OFF인 카테고리는 Role을 생성하지 않고 구독 목록, 공지 저장, 알림 대상에서 제외한다.

Button

이전

저장

다음

하단 액션 상태 안내

저장 / 다음 버튼 왼쪽에 작은 상태 문구를 표시한다.

- 저장하지 않은 변경사항이 있음: Warning Text
  - 문구: 저장하지 않은 변경사항이 있습니다. 다음은 마지막 저장 상태로 진행됩니다.
- 저장 완료: Success Text
  - 문구: 저장되었습니다.
- 저장 실패 또는 필수 설정 누락: Error Text
  - 문구: 저장에 실패했습니다. 입력값을 확인해주세요.

다음 버튼 규칙

- 감지된 카테고리가 없으면 저장과 다음을 모두 비활성화한다.
- 저장 이력이 없으면 다음은 비활성화한다.
- 저장 이력이 있으면 이후 변경사항이 생겨도 다음은 활성화 상태를 유지한다.
- 저장하지 않은 변경사항이 있는 상태에서 다음을 누르면 마지막 저장 상태 기준으로 다음 단계로 이동한다.
- 저장 버튼은 여러 번 수정할 수 있도록 항상 같은 위치에 유지한다.

빈 상태

감지된 카테고리 목록이 없을 때는 테이블 내부에 빈 상태를 표시한다.

문구: 감지된 카테고리가 없습니다. 사이트 등록에서 테스트 크롤링을 먼저 진행해주세요.

Guide

카테고리 확인

Discord 채널 선택

Role 자동 생성 안내

스크롤

Main 영역만 세로 스크롤되며 Sidebar와 Guide는 화면에 유지된다.

---

## S4 설정 완료

목적

관리자 설정 완료 상태와 사용 가능한 명령어를 안내한다.

Success

설정이 완료되었습니다!

IRIS가 설정한 Discord 채널로 공지 알림을 전송한다.

Command List

/help

/setup

/subscribe

/keyword

Button

관리자 페이지로 이동

Guide

/setup은 관리자만 사용할 수 있다.

설정은 언제든 수정할 수 있다.

---

## S5 Discord

/help

목적

사용 가능한 Discord 명령어 목록을 보여준다.

UI

Discord Dark Window

Bot Card

명령어 목록

/setup

/help

/subscribe

/keyword

---

## S6 Discord

/subscribe

목적

사용자가 받고 싶은 카테고리 알림을 선택한다.

UI

Checkbox List

구독 저장 Button

표시 규칙

활성화된 카테고리를 우선 표시한다.

저장 후 선택된 카테고리 Role을 사용자에게 부여한다.

---

## S7 Discord

/keyword

목적

사용자가 관심 키워드를 등록하고 관련 공지를 DM으로 받는다.

UI

Keyword Input

취소

등록

Success Bot Card

동작

키워드 등록

키워드 삭제

키워드 목록 확인

DM 알림

---

# 10. Navigation

Landing

↓

Discord 봇 초대하기

↓

/setup

↓

사이트 등록

↓

카테고리 설정

↓

설정 완료

↓

사용자 Discord 명령어

/help

/subscribe

/keyword

---

# 11. Motion

Scroll

부드러운 페이지 이동

Hover

Button, Card, Sidebar Item에 가벼운 반응

Loading

테스트 크롤링 실행 시 로딩 상태 표시

Toast

저장 완료, 키워드 등록 완료 등 짧은 피드백에 사용

Inline Status Text

저장/다음 같은 하단 액션과 직접 관련된 상태는 Toast보다 버튼 줄 안의 작은 텍스트로 표시한다.

- Warning Text: 저장하지 않은 변경사항, 마지막 저장 상태로 진행 안내
- Success Text: 저장 완료
- Error Text: 저장 실패, 필수 설정 누락

색상 사용

- Warning Text: 주황 계열
- Success Text: 초록 계열
- Error Text: 빨간 계열

Transition

과도한 애니메이션보다 빠르고 명확한 상태 변화 중심

---

# 12. Responsive

Desktop First

관리자 페이지는 Desktop 우선으로 설계한다.

Tablet / Mobile

1100px 이하에서 주요 Grid는 1 column으로 전환한다.

Admin

Sidebar는 상단 가로 메뉴 형태로 전환한다.

Guide Panel은 Main 아래로 이동하며 border-left 대신 border-top을 사용한다.

사이트 등록과 카테고리 설정의 Main 내부 스크롤은 해제하고 전체 페이지 스크롤을 사용한다.

Discord

Discord Panel은 1 column으로 쌓는다.

Flow Summary

단계 요약은 1 column으로 전환하고 화살표는 숨긴다.

---

# 13. Accessibility

Button

명확한 Label을 사용한다.

Contrast

Primary Button은 흰색 텍스트와 Purple Gradient를 사용한다.

Input

Label을 입력 필드 위 또는 좌측에 배치한다.

Keyboard

Button, Link, Input, Select는 키보드 접근이 가능해야 한다.

Alt Text

Logo와 Hero Illustration에는 대체 텍스트를 제공한다.

Readable Text

한국어 본문은 word-break: keep-all을 활용해 어색한 줄바꿈을 줄인다.

---

# 14. Do / Don't

DO

Simple

Card 기반 정보 그룹

Discord Dark Theme 유지

Guide Panel 유지

Selector 테스트 결과 미리보기 제공

카테고리와 Role 관계를 명확하게 표현

DON'T

긴 설정을 한 화면에 과도하게 압축

불필요한 팝업

과도한 애니메이션

Discord Preview를 Light UI로 표현

Guide 없이 Selector만 입력하게 하기

활성화 OFF 카테고리의 알림 여부를 모호하게 표현

---

# 15. Example Prompt for AI Coding Agent

DESIGN.md를 기준으로

IRIS Landing 및 관리자 설정 프로토타입을 HTML/CSS로 구현한다.

조건

- Discord 기반 대학 공지 알림 서비스
- 밝은 관리자 UI와 Discord Dark Preview를 분리
- Purple Primary Color 사용
- Card UI 유지
- Sidebar 유지
- Guide Panel 유지
- Pretendard / Inter Font 사용
- Radius와 Shadow 일관성 유지
- Site 등록 → Selector 설정 → Category 설정 → 완료 흐름 구현
- /help, /subscribe, /keyword Discord Preview 구현
- DESIGN.md를 절대 기준으로 구현

---

# 16. Suggested Component Names

PrototypeLayout

LandingHeader

Brand

HeroSection

FeatureGrid

FeatureCard

AdminLayout

Sidebar

SideItem

GuidePanel

FormSection

SelectorRow

NoticePreview

CategoryTable

Toggle

CompleteView

CommandList

DiscordPanel

DiscordWindow

DiscordSidebar

BotCard

KeywordModal

FlowSummary

---

# 17. Final Direction

IRIS는 관리자가 대학 공지 사이트를 빠르게 연결하고, 사용자가 Discord 안에서 필요한 공지만 선택적으로 받아볼 수 있는 서비스를 목표로 한다.

전체 디자인은 밝은 관리자 경험, 명확한 단계 흐름, Discord Native 사용성을 중심으로 구성한다.

모든 화면은 같은 Color, Radius, Typography, Card 규칙을 유지하며 구현한다.
