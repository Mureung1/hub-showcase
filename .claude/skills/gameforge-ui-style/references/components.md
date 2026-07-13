# Component Patterns

Every class/state below is copied verbatim from `references/prototype.html` (CSS from the `<style>` block, markup from the `<body>`). When a prototype's example uses inline `style="..."` for one-off layout (max-width, margin, flex gaps), that's the prototype's convention too — it doesn't have a full utility-class system, so small one-off layout tweaks via inline style (or the React equivalent, an inline `style` prop) are consistent with the source, not a deviation from it. Reach for a named class only when the pattern repeats.

## Base form controls

```css
input[type=text], select {
  width:100%; background:var(--panel-3); border:1px solid var(--border);
  border-radius:6px; padding:9px 10px; color:var(--text); outline:none;
}
input[type=text]:focus, select:focus { border-color:var(--border-strong); }
button {
  background:transparent; border:1px solid var(--border-strong); color:var(--text);
  border-radius:6px; padding:9px 16px; cursor:pointer; transition:background .12s;
}
button:hover { background:var(--panel-3); }
button.primary { border-color:var(--teal); color:var(--teal); }
button.primary:hover { background:var(--teal-bg); }
button:active { transform:scale(0.98); }
button:disabled, select:disabled { opacity:0.4; cursor:not-allowed; pointer-events:none; }
select:disabled { background:var(--panel-2); }
```

- Only one button per view should be `.primary` (teal outline) — it marks the forward-moving action (Approve, 로그인, 연결 및 분석 시작, 전송, 커밋). Secondary actions (반려, 취소, 로그아웃, 다시 열기) stay unstyled/transparent.
- Locking a control ahead of its unlock condition (progressive-lock pattern, see UI Spec §2) means disabling it directly (`disabled` attribute), not just dimming it with CSS — the prototype's `presetSection` locked state additionally sets `opacity:0.4; pointer-events:none` on the whole wrapping section, since it contains multiple inputs that don't each carry their own `disabled`.

## App bar & tabs

```css
.appbar { height:48px; display:flex; align-items:center; justify-content:space-between; padding:0 18px; border-bottom:1px solid var(--border); background:var(--panel); }
.brand { display:flex; align-items:center; gap:8px; font-weight:600; font-size:14px; }
.brand .dot { width:8px; height:8px; border-radius:50%; background:var(--teal); }
.tabs { display:flex; gap:2px; background:var(--panel-3); border-radius:8px; padding:3px; }
.tabs button { border:none; padding:6px 14px; font-size:12.5px; border-radius:6px; color:var(--text-dim); }
.tabs button.active { background:var(--panel-2); color:var(--text); border:1px solid var(--border); }
.tabs button:hover { color:var(--text); }
```

The prototype's tab bar was only for jumping between the 4 mock screens during design review — in the real app, navigation between screens is driven by workflow state (login → repo → branch → preset → analysis → workspace), not free tab-switching, so don't reuse `.tabs` as primary navigation. It's fine to keep for an internal/debug screen switcher if one is ever needed.

## Card

The general-purpose container for a single focused task (Repo connect, Analysis report).

```css
.card { background:var(--panel); border:1px solid var(--border); border-radius:12px; overflow:hidden; }
.card-head { padding:14px 18px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:8px; }
.card-body { padding:18px; }
.card-foot { padding:14px 18px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:8px; }
```

`card-foot` right-aligns its buttons by default (`justify-content:flex-end`); when one action is a "back/secondary" action that should sit on the opposite side (e.g. Analysis report's "✎ 원문 수정" vs Approve), override with `justify-content:space-between` on that instance, as the prototype does.

## Micro-labels

```css
.label-mono { font-family:var(--mono); font-size:11px; color:var(--text-mute); letter-spacing:.03em; display:block; margin-bottom:6px; }
```
Used above every form field (`REPOSITORY`, `BRANCH`) and as small metadata lines (`GitHub 연결됨`, `branch: develop`). Always uppercase in the source strings — match that convention for new labels of this kind.

## Badges

```css
.badge { font-size:11px; padding:3px 9px; border-radius:5px; }
.badge.success { background:var(--teal-bg); color:var(--teal); }
.badge.warning { background:var(--amber-bg); color:var(--amber); }
.badge.danger { background:var(--red-bg); color:var(--red); }
```
Maps directly onto the fixed status semantics in `tokens.md` — success/warning/danger, not "type A/B/C". Example usage: `<span class="badge success">분석 완료</span>`, `<span class="badge warning">진행 중</span>`.

## Preset picker (radio cards)

```css
.preset { display:flex; align-items:center; gap:10px; padding:11px 12px; border:1px solid var(--border); border-radius:8px; cursor:pointer; margin-bottom:8px; }
.preset.selected { border-color:var(--teal); background:var(--teal-bg); }
.preset input { margin:0; accent-color:var(--teal); }
.preset .name { font-weight:500; font-size:13px; }
.preset .desc { font-size:12px; color:var(--text-dim); }
.preset .tag { font-size:10.5px; color:var(--teal); margin-left:6px; }
```
Each preset is a `<label class="preset">` wrapping a radio input, an emoji icon, and a name/description block — clicking anywhere in the row toggles the radio (native label behavior, no JS needed for that part). The recommended option carries a `.tag` badge inline in its name (`기본 <span class="tag">권장</span>`).

## Stat grid

```css
.stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px; }
.stat { background:var(--panel-2); border-radius:8px; padding:12px 14px; }
.stat .n { font-size:22px; font-weight:600; margin-top:4px; }
```
Three stat tiles side by side (analysis report's 클래스 의존성/중복 코드 블록/리팩토링 대상). The `.n` number can carry an inline color override (`style="color:var(--amber)"` / `var(--red)`) when the metric itself is a warning/danger count — the grid/tile styling stays neutral, only the number changes color.

## Code / markdown blocks

```css
pre.code {
  font-family:var(--mono); font-size:12px; line-height:1.7; background:var(--panel-2);
  border:1px solid var(--border); border-radius:8px; padding:14px; color:var(--text-dim);
  white-space:pre-wrap; overflow-x:auto;
}
.code-editor {
  width:100%; min-height:140px; resize:vertical;
  font-family:var(--mono); font-size:12px; line-height:1.7; background:var(--panel-2);
  border:1px solid var(--teal); border-radius:8px; padding:14px; color:var(--text); outline:none;
}
```
Read-only preview uses `pre.code` (dim text, neutral border). Switching to edit mode swaps in `.code-editor` — same surface color, but the border becomes `--teal` to signal "this is now live/editable", and text goes from dim to full `--text`. This preview↔editor swap (not a permanently-visible textarea) is the pattern for every single-document approval step:

```js
// from the prototype — read this to reproduce the exact toggle behavior
function enterEditMode(){
  mdEditorEl.value = mdContentEl.textContent;
  mdContentEl.style.display = 'none';
  mdEditorEl.style.display = 'block';
  mdEditActionsEl.style.display = 'flex';
  mdEditBtn.style.display = 'none';
}
function exitEditMode(){ /* reverses the above */ }
```
Switching to a different sidebar step while mid-edit calls `exitEditMode()` first and discards the unsaved textarea content — the prototype treats this as "no confirm needed", but the dev plan (§4.5) flags a confirm dialog as worth reconsidering for the real app.

## Workspace layout (sidebar + main)

```css
.workspace { display:flex; border:1px solid var(--border); border-radius:12px; overflow:hidden; min-height:560px; }
.sidebar { width:230px; flex-shrink:0; background:var(--panel); border-right:1px solid var(--border); }
.sidebar-head { padding:14px; border-bottom:1px solid var(--border); }
.steps { padding:8px 6px; }
.step-row { display:flex; align-items:center; gap:8px; padding:7px 8px; border-radius:6px; cursor:default; }
.step-n { font-family:var(--mono); font-size:11px; width:18px; }
.step-label { flex:1; font-size:12.5px; }
.step-pct { font-family:var(--mono); font-size:11px; }
.step-row.done .step-n, .step-row.done .step-pct { color:var(--teal); }
.step-row.active .step-n, .step-row.active .step-pct { color:var(--amber); }
.step-row.pending .step-n, .step-row.pending .step-pct, .step-row.pending .step-label { color:var(--text-mute); }
.step-row.active-selected { outline:1px solid var(--border-strong); background:var(--panel-3); }
.step-row:hover:not(.pending) { background:var(--panel-3); }

.ws-main { flex:1; padding:22px 26px; background:var(--panel-2); display:flex; flex-direction:column; gap:16px; }
.ws-eyebrow { font-family:var(--mono); font-size:11px; color:var(--teal); }
.ws-title { font-size:16px; font-weight:600; margin-top:2px; }
```

Three independent status classes on `.step-row` (`done` / `active` / `pending`) color the step number + percentage, separate from `active-selected` which is purely "this is the row currently open in the main panel" (an outline, not a color change). A row can be `done` *and* `active-selected` at once if the user reopens a completed step to re-read it — don't conflate "workflow status" with "currently viewing."

Only `done` and `active` rows are clickable (`cursor:pointer`, hover background); `pending` rows keep `cursor:not-allowed` and carry a tooltip explaining why (`title="이전 단계를 먼저 완료해야 볼 수 있어요"`) instead of just silently doing nothing on click.

## Chat / Q&A box

```css
.qa-box { background:var(--panel); border:1px solid var(--border); border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:10px; max-height:340px; }
.chat-head { display:flex; align-items:center; justify-content:space-between; font-family:var(--mono); font-size:11px; color:var(--text-mute); }
.chat-messages { display:flex; flex-direction:column; gap:8px; overflow-y:auto; padding-right:4px; }
.chat-msg { max-width:82%; padding:9px 12px; border-radius:10px; font-size:13px; line-height:1.5; }
.chat-msg.agent { align-self:flex-start; background:var(--panel-2); border:1px solid var(--border); border-bottom-left-radius:3px; }
.chat-msg.user { align-self:flex-end; background:var(--teal-bg); border:1px solid var(--teal); color:var(--text); border-bottom-right-radius:3px; }
.chat-msg.typing { align-self:flex-start; background:var(--panel-2); border:1px solid var(--border); color:var(--text-mute); font-family:var(--mono); border-bottom-left-radius:3px; }
```
Agent bubbles left-aligned, user bubbles right-aligned and teal-tinted, both with an asymmetric corner (`border-bottom-*-radius:3px`) pointing toward the edge they're anchored to — that's what makes them read as a chat bubble rather than a generic rounded box. The `typing` state reuses the agent bubble's position/shape but in muted mono text ("입력 중…"), not a spinner or dots animation.

## Commit review / diff screen

```css
.commit-shell { display:flex; border:1px solid var(--border); border-radius:12px; overflow:hidden; min-height:520px; }
.file-list { width:300px; flex-shrink:0; background:var(--panel); border-right:1px solid var(--border); overflow-y:auto; }
.file-row { padding:10px 14px; border-bottom:1px solid var(--border); cursor:pointer; display:flex; gap:8px; align-items:flex-start; }
.file-row:hover { background:var(--panel-3); }
.file-row.selected-file { background:var(--panel-3); border-left:2px solid var(--teal); }
.change-badge { font-size:10px; font-family:var(--mono); padding:2px 6px; border-radius:4px; flex-shrink:0; margin-top:1px; }
.change-badge.new { background:var(--teal-bg); color:var(--teal); }
.change-badge.modified { background:var(--amber-bg); color:var(--amber); }
.change-badge.deleted { background:var(--red-bg); color:var(--red); }

pre.diff { font-family:var(--mono); font-size:12px; line-height:1.7; background:var(--panel); border:1px solid var(--border); border-radius:8px; padding:14px; margin:0; overflow-x:auto; white-space:pre; }
.diff-line.add { background:var(--teal-bg); color:var(--teal); }
.diff-line.del { background:var(--red-bg); color:var(--red); }
.diff-line.ctx { color:var(--text-dim); }
```
Same three-way new/modified/deleted vocabulary as the sidebar's done/active/pending, reusing the same teal/amber/red mapping — new≈done(teal), modified≈active(amber), deleted≈danger(red). Each file row has its own checkbox (independent of the diff selection state — clicking the checkbox must `stopPropagation()` so it doesn't also trigger `renderDiff()` for that row, see the prototype's script section).

## Layout scaffolding

```css
.screen { padding:32px 24px; max-width:1080px; margin:0 auto; }
```
Every top-level screen centers itself with the same max-width and padding — a new screen/page component should wrap its content the same way rather than picking arbitrary padding/width per page.
