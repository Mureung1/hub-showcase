# UI/UX 감사 리포트

## Audit Scope

- Product: 대학 축제 가이드 프론트엔드 MVP
- URL: `http://127.0.0.1:5173/`
- Viewport: `390 x 844`
- Mode: Combined UX and accessibility audit
- Evidence folder: `audit/ui-ux-review/`

## Captured Flow

1. `01-home.png`: Home
2. `02-timetable.png`: Timetable
3. `03-booths.png`: Booth list
4. `04-booth-detail.png`: Booth detail
5. `05-notices.png`: Notice list
6. `06-notice-detail.png`: Notice detail

## Overall Assessment

The current UI/UX is appropriate for a first MVP. It supports the core visitor tasks: checking the next schedule, browsing timetable items, finding booths, reading booth menus/prices, and reading notices.

The design direction is also aligned with `Today Simple`: clear typography, low decoration, strong contrast, and simple navigation. The biggest issues are not visual polish problems; they are information-architecture and MVP-content gaps.

## Strengths

- Home screen has a clear primary judgment: current festival state and next event.
- The UI avoids dashboard clutter and keeps the first screen readable.
- Timetable and booth filters are visible, simple, and touch-friendly.
- Booth detail presents the most important purchase information clearly: location, hours, menu, price.
- Notice list and detail flow are straightforward.
- Visual language is consistent: white surface, green primary action/state, blue booth accent, orange notice importance.
- Text contrast appears strong in all captured screens.

## UX Risks

### P1. Bottom navigation label `더보기` hides the notice destination

Evidence: `05-notices.png` shows the active bottom item as `더보기`, but the screen is `공지사항`.

Impact: Notices are one of the three MVP pillars. Labeling the tab as `더보기` makes the core information architecture less clear and may slow visitors looking for urgent announcements.

Recommendation: Rename the fourth bottom tab to `공지`. If a future more menu is needed, add it later after notices have their own direct path.

### P1. Booth map requirement is only represented as text

Evidence: `03-booths.png` shows `오늘의 배치도` with zone text, not a map or layout image.

Impact: The plan calls for a date-specific booth layout image. For a festival visitor, booth location is a spatial task. Text zones are useful but not enough for wayfinding.

Recommendation: Replace the summary box with a real map/image placeholder sized for the final asset. Until real assets exist, use a clearly labeled temporary campus map mock.

### P2. Home does not directly show any booth preview

Evidence: `01-home.png` shows booth operation status and a booth shortcut, but no example currently open booth.

Impact: The planning scenario says users want to quickly confirm operating booths. The current home prioritizes the next schedule well, but booth discovery requires another tap.

Recommendation: Add one small, low-density booth preview such as `운영 중인 부스 24개` or `인기 부스 1개`. Keep it compact so the home does not become a dashboard.

### P2. Static current time/weather can create trust issues

Evidence: `01-home.png` shows `14:20`, `22℃`, `맑음`.

Impact: These look live. If they are mock values, users may assume the rest of the operational state is also live.

Recommendation: Either connect these values to real/current data, remove weather for MVP, or label the prototype data clearly in non-production environments.

### P2. Detail screens rely on the bottom nav for cross-section escape

Evidence: `04-booth-detail.png` and `06-notice-detail.png` show a back button and the global bottom nav.

Impact: This is workable, but there is no screen title context beyond the item title. Users who enter from a list understand it; users who land directly on a detail later may need stronger context.

Recommendation: Keep the back button, but consider a small contextual label such as `부스 상세` or `공지 상세` if direct links/routes are added.

## Accessibility Risks

### P1. Icon-only notification button needs visible purpose clarification

Evidence: `01-home.png` shows a bell icon with a green dot.

Impact: There is an accessible label in code, but visually the icon competes with notice navigation. Sighted users may not know whether it opens all notices, unread notices, or alerts.

Recommendation: For MVP, either keep the bell but ensure it opens notices consistently, or remove it and rely on the visible notice strip and bottom notice tab.

### P2. Small metadata text may be hard outdoors

Evidence: location/time metadata in `01-home.png`, `02-timetable.png`, and `03-booths.png` is readable but comparatively light.

Impact: Festival usage happens outdoors and on the move. Secondary text contrast and size should be conservative.

Recommendation: Keep metadata at 15-16px where possible and avoid going lighter than the current muted token.

### P2. Screenshot audit cannot verify keyboard and screen reader flow

Evidence limit: screenshots confirm visual structure but not focus order, semantic announcements, or interaction names.

Recommendation: Run a keyboard pass for tab order and a screen reader smoke test before any public pilot.

## Opportunity Areas

1. Clarify navigation: use `공지` instead of `더보기`.
2. Improve booth wayfinding: real map/image area and booth zone affordance.
3. Add a compact booth signal on home without increasing density.
4. Decide which fields are live vs static before showing them as operational facts.
5. Add empty/error/loading states once data source changes from static mock data.

## Step Notes

### 1. Home

Health: Good.

The screen is readable and aligned with the design system. The next event CTA is obvious. The main issue is that notices have two entry points while booth status is only summarized.

### 2. Timetable

Health: Good.

Date and category filters are easy to find. The row structure is scannable and the time column works well. No detail screen is needed per MVP scope.

### 3. Booth List

Health: Mostly good.

Search, category, date, location, hours, and menu hints are present. The missing piece is a visual booth map or realistic placeholder.

### 4. Booth Detail

Health: Good.

Location, hours, menu, and prices are clear. Good MVP-level detail page.

### 5. Notice List

Health: Good with navigation naming issue.

The notice list itself is clear. The bottom nav label `더보기` does not match the screen purpose.

### 6. Notice Detail

Health: Good.

The detail view is simple and readable. It will need stronger long-form handling if real notices are much longer.

## Evidence Limits

- This audit used screenshots and click-through flow capture.
- It does not prove full WCAG compliance.
- It does not test screen reader output, browser zoom, reduced motion, or keyboard-only navigation.
- It does not validate real data freshness because current data is static mock data.
