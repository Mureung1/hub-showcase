# RecipeBook Design Guidelines

Version: 1.0 (Draft)

---

# 1. Product Vision

## 우리는 무엇을 만드는가?

RecipeBook은 레시피를 검색하는 서비스가 아니다.

RecipeBook은 **개인의 레시피를 오랫동안 보관하고, 사람과의 기억까지 함께 기록하는 개인 레시피북**이다.

AI는 사용자를 대신하지 않는다.

AI는 기록을 시작하기 쉽게 만드는 조용한 조력자이다.

사용자가 저장하는 것은 레시피가 아니라

* 경험
* 기억
* 관계
* 그리고 시간이 담긴 기록이다.

---

# 2. Product Personality

RecipeBook을 사람으로 표현한다면 다음과 같다.

* 조용하다.
* 따뜻하다.
* 정리정돈을 잘한다.
* 오래 함께할 수 있다.
* 신뢰감을 준다.
* 필요할 때만 말을 건다.

반대로 다음과 같은 성격은 지양한다.

* 과하게 화려하다.
* 시선을 빼앗으려 한다.
* 유행을 쫓는다.
* 사용자를 재촉한다.
* AI를 과시한다.

---

# 3. Design Goals

## Goal 1

### Reading Before Interaction

사용자는 버튼을 누르는 시간보다 레시피를 읽는 시간이 훨씬 길다.

따라서 모든 화면은 "조작"보다 "읽기"를 우선한다.

---

## Goal 2

### Preserve Memory

레시피만 저장하지 않는다.

누가 알려주었는지,

언제 전달받았는지,

내가 어떤 메모를 남겼는지까지 함께 보관한다.

모든 디자인은 이 기억을 자연스럽게 드러내야 한다.

---

## Goal 3

### Calm Experience

화면은 항상 차분해야 한다.

사용자는 앱을 열었을 때

'정보가 많다.'

가 아니라

'잘 정리되어 있다.'

라고 느껴야 한다.

---

## Goal 4

### Ownership

AI는 초안을 만든다.

최종 레시피의 작성자는 언제나 사용자이다.

따라서 저장 전에는 항상 사용자가 내용을 검토하고 수정할 수 있어야 한다.

---

## Goal 5

### Timeless Design

유행하는 디자인보다 오래 사용할 수 있는 디자인을 선택한다.

새로운 트렌드보다 읽기 경험을 우선한다.

---

# 4. Core Design Principles

## Principle 01

### Typography before Decoration

텍스트가 가장 중요한 인터페이스이다.

아이콘보다

색보다

장식보다

텍스트의 계층을 먼저 설계한다.

---

## Principle 02

### Whitespace creates rhythm

여백은 빈 공간이 아니다.

사용자가 자연스럽게 읽을 수 있도록 호흡을 만드는 요소이다.

정보를 추가하기 전에

여백을 충분히 확보할 수 있는지 먼저 고민한다.

---

## Principle 03

### Divider before Card

정보를 구분하기 위해서는

가능하면 Divider를 먼저 사용한다.

카드는 정말 필요한 경우에만 사용한다.

이유는 카드가 많아질수록 문서를 읽는 흐름이 끊기기 때문이다.

---

## Principle 04

### One Primary Action

한 화면에는 하나의 대표 행동만 존재한다.

사용자가 가장 먼저 해야 하는 행동이 무엇인지 명확해야 한다.

---

## Principle 05

### Progressive Disclosure

모든 기능을 한 번에 보여주지 않는다.

수정, 삭제, 공유와 같은 관리 기능은 필요할 때만 드러난다.

레시피가 항상 기능보다 앞에 있어야 한다.

---

# 5. Reading Experience

RecipeBook은 문서를 읽는 경험을 제공한다.

따라서 모든 화면은 다음 순서를 따른다.

1. 제목
2. 맥락
3. 본문
4. 보조 정보
5. 행동

읽는 흐름을 끊는 요소를 최소화한다.

Section은 자연스럽게 이어지며,

사용자는 긴 스크롤을 통해 하나의 이야기를 읽는 경험을 한다.

Accordion이나 과도한 탭 분할은 기본적으로 사용하지 않는다.

---

# 6. Information Hierarchy

모든 화면은 다음 우선순위를 따른다.

Level 1

가장 중요한 콘텐츠

예)

레시피 제목

---

Level 2

본문

예)

재료

조리 순서

---

Level 3

개인 정보

예)

내 메모

관계

출처

---

Level 4

메타데이터

예)

최근 수정일

전달 날짜

AI 초안 여부

---

Level 5

관리 기능

예)

공유

삭제

수정

이 계층은 모든 화면에서 일관되게 유지한다.

---

# 7. Success Criteria

좋은 디자인은

"예쁘다."

가 아니라

"읽기 편하다."

이다.

좋은 디자인은

UI가 기억나는 것이 아니라

레시피가 기억나는 것이다.

사용자가 앱을 닫은 뒤 떠올려야 하는 것은

버튼이나 애니메이션이 아니라

그 레시피와 그 레시피를 알려준 사람이다.

# RecipeBook Design Guidelines

## Part 2. Design Foundations

---

# 8. Design Tokens

Design Token은 디자인 시스템의 가장 작은 단위이다.

모든 화면은 동일한 Token을 사용하여 일관성을 유지한다.

새로운 값은 기존 Token으로 해결할 수 없는 경우에만 추가한다.

---

# 9. Spacing System

## Philosophy

여백은 장식이 아니라 정보를 이해하는 도구이다.

사용자는 여백을 통해

* 정보의 묶음
* 읽는 리듬
* 중요도

를 자연스럽게 인식한다.

Spacing은 시각적 아름다움보다
읽기 경험을 위해 존재한다.

---

## Base Unit

모든 간격은 4px Grid를 따른다.

허용 값

* 4
* 8
* 12
* 16
* 24
* 32
* 48
* 64

가능하면 위 값만 사용한다.

18px, 22px, 27px처럼 임의의 간격은 사용하지 않는다.

---

## Recommended Usage

4px

텍스트와 아이콘

---

8px

Label과 Input

---

12px

Section 내부 요소

---

16px

기본 콘텐츠 간격

---

24px

Section 간격

---

32px

큰 콘텐츠 그룹

---

48px

화면의 주요 구분

---

64px

페이지 시작 또는 종료

---

# 10. Reading Rhythm

모든 화면은 읽기의 리듬을 가진다.

Section은 단순한 그룹이 아니라

사용자가 한 번 숨을 쉬는 지점이다.

기본 구조

제목

↓

24px

↓

본문

↓

16px

↓

본문

↓

24px

↓

다음 Section

Section 사이에는 충분한 여백을 확보한다.

---

# 11. Grid System

기본은 Mobile First

Design Width

390px

Safe Area를 고려한다.

기본 Padding

좌우 20px

콘텐츠 최대 폭은 화면을 꽉 채우지 않는다.

숨 쉴 공간을 남긴다.

---

## Vertical Structure

Top App Bar

↓

Header

↓

Scrollable Content

↓

Bottom Safe Area

↓

Primary CTA (필요한 경우)

모든 화면은 이 구조를 우선적으로 따른다.

---

# 12. Layout Patterns

RecipeBook은 새로운 레이아웃을 계속 만들지 않는다.

아래 네 가지 패턴을 재사용한다.

---

## Pattern A

Reading Layout

Header

↓

Section

↓

Section

↓

Section

↓

Bottom Safe Area

사용 화면

* Recipe Detail
* Received Recipe Preview

---

## Pattern B

List Layout

Header

↓

Search

↓

Filter

↓

List

↓

Bottom Navigation

사용 화면

* Recipe List

---

## Pattern C

Editor Layout

Header

↓

Introduction

↓

Editable Content

↓

Sticky CTA

사용 화면

* Add Recipe
* Recipe Editor

---

## Pattern D

Relationship Layout

Header

↓

Summary

↓

Relationship Form

↓

Memo

↓

Sticky CTA

사용 화면

* Save Received Recipe

새 화면은 기존 패턴을 우선 사용한다.

---

# 13. Information Grouping

정보를 그룹화하기 위해

Card보다 Section을 먼저 고려한다.

우선순위

Whitespace

↓

Divider

↓

Background Difference

↓

Card

Card는 정말 필요한 경우에만 사용한다.

---

# 14. Divider System

Divider는

정보를 나누기 위한 요소이지

장식이 아니다.

사용 위치

* Section 구분
* 긴 문서
* Form 그룹

사용하지 않는 위치

* 카드 내부 장식
* 리스트의 모든 항목

Divider는 사용자의 읽는 흐름을 도와야 한다.

---

# 15. Corner Radius

Radius는 부드러움을 표현하지만

과하게 둥글지 않는다.

Primary Button

16px

Input

16px

Textarea

16px

Bottom Sheet

28px

Chip

999px

Card

16px

Radius는 화면마다 달라지지 않는다.

---

# 16. Elevation

RecipeBook은 Shadow를 최소한으로 사용한다.

우선순위

Whitespace

↓

Divider

↓

Border

↓

Shadow

Shadow는 계층을 표현하기 위한 마지막 수단이다.

권장

Level 0

기본 화면

Level 1

Bottom Sheet

Level 2

Modal

그 외의 요소는 Shadow 없이도 구분 가능해야 한다.

---

# 17. Visual Density

기본 밀도는 Comfortable를 사용한다.

한 화면에 너무 많은 정보를 넣지 않는다.

사용자는

빠르게 스캔하는 것이 아니라

천천히 읽는다.

읽기 속도에 맞는 정보 밀도를 유지한다.

---

# 18. White Space Rules

여백은 비어 있는 공간이 아니다.

여백은 콘텐츠의 일부이다.

Rule

콘텐츠를 추가하기 전에

여백을 줄이고 있는 것은 아닌지 먼저 확인한다.

Rule

한 화면에 하나 이상의 "숨 쉬는 공간"이 존재해야 한다.

Rule

모든 Section은 독립적으로 읽을 수 있어야 한다.

---

# Design Review Checklist

새로운 화면을 만들 때 반드시 확인한다.

□ 사용자가 무엇을 먼저 읽어야 하는지 3초 안에 알 수 있는가?

□ 제목과 본문의 계층이 명확한가?

□ Card 없이도 이해 가능한가?

□ Divider 없이도 충분히 구분되는가?

□ 여백이 충분한가?

□ 새로운 Layout을 만들지 않고 기존 Pattern을 사용했는가?

□ Primary Action이 하나뿐인가?

□ 화면이 아니라 콘텐츠가 기억에 남는가?

# RecipeBook Design Guidelines

## Part 3. Component System

---

# Component Philosophy

컴포넌트는 화면을 꾸미기 위해 존재하지 않는다.

컴포넌트는

읽기 흐름을 방해하지 않으면서

정보를 자연스럽게 전달하기 위해 존재한다.

새로운 컴포넌트를 만들기 전에

기존 컴포넌트의 조합으로 해결할 수 있는지 먼저 고민한다.

---

# Component Hierarchy

RecipeBook은 다음 순서로 컴포넌트를 사용한다.

Recipe Section

↓

Metadata

↓

Input

↓

Button

버튼은 콘텐츠보다 앞에 오지 않는다.

---

# Recipe Section ⭐

서비스에서 가장 중요한 컴포넌트

---

Purpose

레시피의 하나의 주제를 표현한다.

예시

재료

조리 순서

메모

관계

출처

---

Structure

Section Title

↓

Divider

↓

Content

---

Rule

모든 Recipe Section은 동일한 구조를 가진다.

카드를 사용하지 않는다.

Section은 독립적으로 읽을 수 있어야 한다.

---

Do

재료

──────────

김치

두부

대파

---

Don't

[ Card ]

재료

...

---

Why

Section은 문서를 읽는 경험을 만든다.

카드는 정보를 분리하지만

Section은 정보를 이어준다.

---

# Recipe Metadata

Purpose

레시피의 보조 정보를 표현한다.

예시

최근 수정

전달 날짜

출처

AI 초안

---

Rule

본문보다 작다.

회색 계열 사용

한 줄 표현

Metadata는

본문보다 먼저 읽혀서는 안 된다.

---

# Source Block

Purpose

레시피의 출처를 보여준다.

예시

YouTube

블로그

직접 입력

전달받음

---

Structure

출처

채널명

URL

---

Rule

항상 화면의 마지막 근처에 위치한다.

출처는

본문보다 중요하지 않다.

---

# Relationship Block

서비스 고유 컴포넌트

---

Purpose

이 레시피와 연결된 사람을 기록한다.

예시

엄마

친구

직장 동료

---

Structure

이름

↓

관계

↓

전달 날짜

---

Rule

Relationship는

사람을 보여주는 컴포넌트이다.

아이콘보다

텍스트를 우선한다.

---

# Memory Note

서비스의 핵심 컴포넌트

---

Purpose

사용자의 경험을 저장한다.

예시

다음에는

고춧가루를 조금 줄여도 좋겠다.

---

Rule

회색 Box를 사용하지 않는다.

본문처럼 자연스럽게 이어진다.

---

Why

메모는

레시피와 분리된 정보가 아니다.

레시피의 일부이다.

---

# Primary Button

Purpose

사용자가 가장 중요한 행동을 수행한다.

---

Rule

화면당 하나만 존재한다.

Full Width

Bottom Sticky

높이

52

Radius

16

---

Text

항상 행동을 표현한다.

좋은 예

레시피 저장

내 레시피북에 저장

레시피 정리하기

---

좋지 않은 예

확인

완료

다음

---

# Secondary Button

텍스트 버튼

또는

Outline

Primary와 경쟁하지 않는다.

---

# Input

Purpose

사용자의 생각을 입력한다.

---

Rule

입력 형식을 강요하지 않는다.

Placeholder는

사용자의 부담을 줄이는 문장을 사용한다.

---

좋은 예

기억나는 대로 적어보세요.

---

좋지 않은 예

입력하세요.

---

# Textarea

서비스에서 매우 자주 사용된다.

충분한 높이를 확보한다.

자동 줄바꿈

자동 확장

---

# Divider

Purpose

읽기의 리듬을 만든다.

---

Rule

Card 대신 Divider를 우선한다.

Divider는

장식이 아니다.

---

# Chip

사용

필터

관계

태그

---

Rule

짧은 정보만 표현한다.

선택 상태만 색을 가진다.

---

# Bottom Sheet

관리 기능

삭제

공유

등을 수행한다.

---

Rule

Primary Action을 제외한

모든 관리 기능은

Bottom Sheet를 우선 고려한다.

---

# Toast

짧은 성공 메시지

예시

레시피북에 저장되었습니다.

---

Rule

사용자의 행동을 방해하지 않는다.

2초 이내 사라진다.

---

# Empty State

서비스에서 매우 중요하다.

빈 화면은

기능 설명이 아니라

사용자의 첫 행동을 유도한다.

---

좋은 예

첫 번째 레시피를

추가해 보세요.

---

좋지 않은 예

데이터가 없습니다.

---

# AI Components

AI Badge

최소한으로 사용

AI Draft Banner

한 번만 표시

AI Loading

조용한 애니메이션

Rule

AI는

서비스의 주인공이 아니다.

---

# Component Review Checklist

새로운 컴포넌트를 만들기 전에

□ 기존 컴포넌트로 해결 가능한가?

□ 읽기 흐름을 방해하지 않는가?

□ Button보다 콘텐츠가 먼저 보이는가?

□ Card 없이 가능한가?

□ Divider로 충분한가?

□ 이 컴포넌트가 RecipeBook다움을 만드는가?

# RecipeBook Design Guidelines

## Part 4. Visual Language

---

# Visual Philosophy

RecipeBook의 시각적 요소는 콘텐츠를 꾸미지 않는다.

색상

타이포그래피

아이콘

애니메이션

모두 레시피를 더 편하게 읽기 위한 도구이다.

사용자가 기억해야 하는 것은

UI가 아니라

레시피이다.

---

# 1. Color Language

색은 브랜드의 분위기를 만드는 것이 아니라

사용자의 행동을 설명하기 위해 사용한다.

색은 항상 의미를 가진다.

의미 없는 강조색은 사용하지 않는다.

---

## Primary

의미

사용자가 가장 중요한 행동을 수행하는 순간

사용 위치

* 레시피 저장
* 레시피 정리하기
* 내 레시피북에 저장

느낌

차분함

신뢰

오래 사용할 수 있는 안정감

권장 계열

Olive Green

채도가 너무 높지 않은 자연스러운 녹색

---

## Surface

의미

콘텐츠가 놓이는 공간

원칙

순백보다 약간 따뜻한 톤을 사용한다.

종이를 연상시키는 편안한 배경을 지향한다.

---

## Background

의미

화면의 가장 바깥 공간

원칙

콘텐츠보다 먼저 눈에 들어오면 안 된다.

배경은 존재감을 드러내지 않는다.

---

## Text Primary

가장 중요한 정보

예시

레시피 제목

Section 제목

---

## Text Secondary

보조 설명

예시

출처

설명

관계

---

## Text Tertiary

메타데이터

예시

최근 수정일

전달 날짜

AI 초안 안내

---

## Success

의미

저장이 완료되었음을 알려준다.

사용 위치

Toast

완료 메시지

과도한 초록색 강조는 하지 않는다.

---

## Warning

사용자 확인이 필요한 경우

예시

작성 중 나가기

삭제 전 확인

---

## Danger

삭제

되돌릴 수 없는 작업

Danger 색은 매우 드물게 사용한다.

---

# Color Principles

Rule

Primary Color는 화면당 하나의 행동만 강조한다.

Why

여러 CTA가 같은 중요도를 가지면 사용자는 망설인다.

---

Rule

색보다 계층을 먼저 설계한다.

Why

좋은 정보 구조는 흑백으로도 이해되어야 한다.

---

Rule

색만으로 정보를 전달하지 않는다.

Why

접근성과 가독성을 함께 고려한다.

---

# 2. Typography

Typography는 RecipeBook의 가장 중요한 UI 요소이다.

사용자는 버튼보다 글을 더 오래 본다.

---

## Information Level 1

사용

레시피 제목

페이지 제목

특징

가장 큰 크기

Semibold

짧은 줄 길이

---

## Information Level 2

사용

Section 제목

특징

본문보다 명확히 구분되지만

제목과 경쟁하지 않는다.

---

## Information Level 3

사용

본문

재료

조리 순서

메모

특징

가장 오래 읽는 영역

줄간격을 충분히 확보한다.

---

## Information Level 4

사용

출처

관계

설명

메타데이터

특징

본문보다 존재감이 약해야 한다.

---

# Typography Principles

Rule

Bold는 강조를 위해 남겨둔다.

본문 대부분은 Regular를 사용한다.

---

Rule

긴 문장은 줄 길이를 짧게 유지한다.

Why

레시피는 빠르게 스캔하는 글이 아니라

차례대로 읽는 글이다.

---

Rule

텍스트 크기보다 줄간격을 먼저 조정한다.

Why

가독성은 크기보다 호흡에서 나온다.

---

# 3. Iconography

아이콘은 텍스트를 대체하지 않는다.

아이콘은 이해를 돕는다.

---

Rule

Outline Icon을 기본으로 사용한다.

Filled Icon은

선택 상태만 사용한다.

---

Rule

아이콘만으로 의미를 전달하지 않는다.

항상 텍스트와 함께 사용한다.

---

# 4. Imagery

사진은 선택 사항이다.

사진이 없어도

서비스 경험은 완전해야 한다.

사진은

레시피를 설명하기 위한 보조 요소이다.

사진이 콘텐츠보다 먼저 보이면 안 된다.

---

# 5. Motion

Motion은 재미가 아니라

이해를 위해 존재한다.

---

사용 예

Bottom Sheet

Toast

화면 전환

Loading

---

사용하지 않는 예

Bounce

과한 Scale

화려한 3D 효과

긴 애니메이션

---

원칙

빠르고

조용하며

예측 가능해야 한다.

---

# 6. Brand Voice

RecipeBook은 명령하지 않는다.

안내한다.

---

좋은 예

레시피를 다듬어 보세요.

기억나는 대로 적어보세요.

나중에 다시 봤을 때 떠올리고 싶은 내용을 남겨보세요.

---

좋지 않은 예

입력하세요.

저장되었습니다.

필수 입력입니다.

---

사용자에게

'실수했다'는 느낌보다

'도움을 받고 있다'는 느낌을 제공한다.

---

# 7. Design Review Questions

새로운 화면을 만들기 전에 반드시 확인한다.

□ 이 화면은 읽기 쉬운가?

□ 사용자는 가장 중요한 정보를 3초 안에 찾을 수 있는가?

□ 사진을 제거해도 화면이 완성되는가?

□ 색을 제거해도 정보 계층이 유지되는가?

□ 버튼보다 콘텐츠가 먼저 보이는가?

□ 사용자가 무엇을 해야 하는지 하나의 행동으로 이해되는가?

□ 이 화면이 5년 뒤에도 촌스럽지 않을 것 같은가?

□ RecipeBook만의 분위기를 유지하고 있는가?
