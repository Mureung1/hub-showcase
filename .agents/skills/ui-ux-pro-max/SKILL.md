---
name: ui-ux-pro-max
description: Modu Brain의 UI/UX 디자인 단순화 및 Notion 스타일 warm-paper 테마 정비를 돕는 스타일 개선 전문 스킬입니다.
---

# UI/UX Pro Max Skill Instructions

본 스킬은 Modu Brain 제품의 UI/UX 디자인 시스템 단순화 및 가로 스크롤 넘침 현상 해결, 웹 접근성 개선을 수행하기 위한 가이드라인입니다.

## 핵심 원칙

1. **Notion 스타일의 단순성 유지**:
   - 불필요한 그라데이션, 화려한 보라·핑크 계열의 AI 색조를 제거합니다.
   - 배경은 따뜻한 웜페이퍼(`--color-page`: `#f6f5f4`), 카드는 순백색(`#ffffff`)을 채택하여 핵심 텍스트와 근거에 집중하게 합니다.
   
2. **구조색 제한**:
   - 검정, 웜페이퍼, 흰색, 파랑(`--color-primary`: `#0075de`)만 사용합니다.
   
3. **가로 넘침 방지**:
   - 모바일 뷰포트(375px)에서 가로 스크롤이 발생하지 않도록 긴 텍스트나 카드 폭은 자동으로 줄바꿈(wrapping)되거나 flex-direction이 column으로 전환되도록 작성합니다.
