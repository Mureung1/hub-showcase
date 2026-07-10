# Dabnyangi Design Tokens

Use these tokens as the canonical 답냥이 visual system.

## CSS Variables

```css
@import url('https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Nunito:wght@500;600;700;800&display=swap');

:root {
  --color-primary: #6caed1;
  --color-primary-hover: #5a9fc4;
  --color-primary-pressed: #4b8fb4;
  --color-primary-soft: #d8edf8;
  --color-primary-muted: #a9cddd;

  --color-bg: #dcebf3;
  --color-bg-deep: #c9dfe9;
  --color-surface: #ffffff;
  --color-surface-soft: #f7fbfd;
  --color-surface-tint: #eef7fb;

  --color-text: #151515;
  --color-text-body: #34343a;
  --color-text-muted: #7e8a93;
  --color-text-subtle: #aab5bc;
  --color-text-on-primary: #ffffff;

  --color-border: #e7eef2;
  --color-border-strong: #d5e2e9;
  --color-disabled: #d9e3e8;

  --color-card-blue: #d6edf8;
  --color-card-blue-strong: #b8ddeb;
  --color-card-peach: #f7dfda;
  --color-card-butter: #fbefd5;
  --color-card-mint: #e2f1ea;
  --color-card-lavender: #ece8f7;

  --color-danger: #c96b63;
  --color-danger-soft: #f6dfdc;
  --color-success: #6ea98c;
  --color-success-soft: #e4f2eb;

  --font-sans: 'Gowun Dodum', 'Nunito', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif;
  --font-display: 'Gowun Dodum', 'Nunito', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif;

  --radius-xs: 10px;
  --radius-sm: 14px;
  --radius-md: 20px;
  --radius-lg: 28px;
  --radius-xl: 34px;
  --radius-screen: 36px;
  --radius-pill: 999px;

  --shadow-shell: 0 24px 70px rgba(91, 128, 146, 0.22);
  --shadow-card: 0 12px 30px rgba(91, 128, 146, 0.12);
  --focus-ring: 0 0 0 3px rgba(108, 174, 209, 0.24);
}
```

## Usage

Colors:
- `--color-bg`: page background.
- `--color-surface`: mobile app shell and main readable panels.
- `--color-primary`: selected state, generate/copy CTA, active progress.
- `--color-primary-soft`: selected-card fill and subtle badges.
- `--color-card-*`: relationship and situation choice cards.
- `--color-danger`: error and placeholder warnings only.

Typography:
- Use `Gowun Dodum` for Korean friendliness and clean readability.
- Use `Nunito` as the rounded Latin/number companion.
- Keep long Korean body/result text at 16px or larger.
- Use display styling only for short headings and brand text.

Radii and spacing:
- App shell: `--radius-screen`.
- Big media or hero blocks: `--radius-xl`.
- Cards: `--radius-lg`.
- Inputs: `--radius-md`.
- Chips/buttons: `--radius-pill`.
- Prefer 20-24px page/card padding on mobile.

Components:

```css
.appShell {
  max-width: 430px;
  min-height: 100svh;
  margin: 0 auto;
  padding: 24px;
  border-radius: var(--radius-screen);
  background: var(--color-surface);
  box-shadow: var(--shadow-shell);
}

.card {
  padding: 20px;
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  background: var(--color-surface-soft);
  box-shadow: var(--shadow-card);
}

.card[data-selected='true'] {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.primaryButton {
  min-height: 56px;
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  box-shadow: 0 12px 26px rgba(108, 174, 209, 0.3);
  font-weight: 750;
}

.chip {
  min-height: 42px;
  border: 0;
  border-radius: var(--radius-pill);
  padding: 0 16px;
  background: #edf4f7;
  color: var(--color-text-body);
  font-weight: 650;
}

.chip[data-selected='true'] {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.input {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-soft);
  color: var(--color-text-body);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--focus-ring);
}
```
