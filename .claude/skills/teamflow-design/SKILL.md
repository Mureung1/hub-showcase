---
name: teamflow-design
description: Use when designing or building any TeamFlow UI — a screen, component, page, or CSS — including the dashboard, task board, meeting notes, resources, team, or AI teammate views. Provides the confirmed design tokens, layout patterns, and known gotchas to keep every screen visually consistent.
---

# TeamFlow Design

## Overview

TeamFlow is a bootcamp team-project management web service. The look is **Notion structure** (sidebar nav, status tags, kanban/list) over a **light dashboard** visual. Aim for a **professional, calm** feel.

**Do NOT make it look like an AI startup:** no gradients, no color blobs, no oversaturated accents, no glowing violet/indigo. The accent is a restrained slate navy — that choice is final (indigo-violet `#7A3FF0` and similar were rejected for reading as "AI tool").

## Tokens (use these — do not invent new colors)

Full ready-to-use CSS variables: see [tokens.css](tokens.css). Drop it in and reference `var(--...)` instead of hardcoding hex.

**Core**
| Role | Value |
|---|---|
| Background | `#F4F4F2` |
| Surface / Card | `#FFFFFF` |
| Surface Sunken (kanban column) | `#FAFAF8` |
| Border / Divider | `#E6E5E1` (heavier: `#ECE9E2`) |
| Text Primary | `#1C1C1E` |
| Text Secondary | `#55555C` (body gray also `#475467`, `#667085`) |
| Text Muted / Label | `#8A8A92` |
| **Accent (brand)** | **`#3D4A63` slate navy** |
| Accent Tint (soft bg) | `#EAECF1` |

**Status** — foreground / background / dot
| Status | fg | bg | dot |
|---|---|---|---|
| 진행 중 (in progress) | `#3860C9` | `#EAF1FF` | `#4D7DF0` |
| 완료 (done) | `#22704A` | `#E8F5EE` | `#3FAE6A` |
| 검토 중 (review) | `#8A5A00` | `#FFF4D8` | `#C98A1F` |
| 지연·취소 (blocked) | `#A3323A` | `#FBE9E9` | `#D1555A` |
| 시작 전 (todo) | `#5C5C66` | `#F0F0F2` | `#9A9AA2` |

**Radius:** sm `8px` (tag/badge) · md `12px` (row/button) · lg `16px` (sub-card) · xl `20px` (panel/module)
**Spacing:** multiples of 4px — `4 / 8 / 12 / 16 / 24 / 40`
**Shadow:** cards use **border only, no shadow**. Shadow only on hover (xs) and modal/dropdown (sm/md).

## Typography

- Body / UI: **Pretendard Variable** (CDN: jsdelivr `orioncactus/pretendard`)
- Numbers / dates only: **IBM Plex Mono**

⚠️ **Critical bug — IBM Plex Mono has no Korean glyphs.** If you apply the mono font to a string mixing digits + Korean (`3개`, `1명`, `마감 D-22`), only the Korean falls back to another font and the line looks broken. **Wrap only the digits in a `<span>` with the mono font; keep Korean units (개/명/마감/종료…) in the base font.**

```html
<!-- ✅ -->
할 일 <span class="mono">3</span>개 · 마감 <span class="mono">D-22</span>
```

## Layout patterns

- **Shell:** `display:grid; grid-template-columns: 220px 1fr;` — fixed 220px sidebar + main.
- **Sidebar (top→bottom):** `← 내 프로젝트` backlink → project icon + name → nav (대시보드 / 할일 / 회의록 / 자료실 / 팀원 / AI팀원) → user profile at bottom.
- **Active nav item:** `background:#EAECF1; color:#3D4A63; font-weight:700`.
- **AI teammate is NOT "coming soon."** Same card style, same list position as human members.
- **Header:** left breadcrumb (small gray) + `<h1>` title; right = primary action button. Use `flex-wrap:nowrap` and `white-space:nowrap` on each text element so it never wraps.
- **Lists/tables:** `grid-template-columns`, header row and data rows share the same column ratio; narrow columns need `white-space:nowrap`.
- **Kanban:** horizontal **swimlane per status** (rows), cards laid out horizontally inside each row (`overflow-x:auto`).
- **Resources:** Google-Drive-style file table (name / owner / modified / type; folders + files mixed; search/filter toolbar).
- Avoid duplicate emphasis/CTA buttons on one screen.

## Screens

Done: Home (project list) · Project Dashboard · Task Management (swimlane kanban) · Meeting Notes · Resources · Team · AI Teammate.
Not started: **project creation screen**.

## Verify before calling a screen done

- [ ] Only tokens above used — no stray hex, no gradients/blobs.
- [ ] Accent is slate navy `#3D4A63`, not violet/indigo.
- [ ] Digits use mono via a `<span>`; Korean units are NOT inside the mono span.
- [ ] Cards use border, not shadow (except hover/modal).
- [ ] Sidebar 220px + active item styled; AI teammate looks like a normal member.
- [ ] Header/list text uses `white-space:nowrap` where noted.
