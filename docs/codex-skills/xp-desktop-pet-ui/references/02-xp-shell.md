# XP Shell

## Desktop

- The desktop is the app shell.
- Use a generated or provided pixel wallpaper, not a CSS-only gradient.
- Current static prototype uses one background image:
  - `public/assets/background/background.png`
- Keep background position `center bottom` and size `cover`.
- Do not add dark tint, blur, or overlay over the wallpaper.

## Icons

- Icons live on the desktop.
- MVP icons: Today Quest, Manager, Profile, Notes, Trash.
- Use pixel PNG/WebP or matching crisp SVG only.
- Do not use generic lucide icons as large desktop icons.
- Labels are code-rendered text under icons.

## Windows

- XP windows are the primary containers.
- Do not wrap the whole page in cards.
- Only one task per window.
- Active window has blue title bar; inactive window is muted blue/gray.
- Title bar buttons are symbolic only: _, ?? 횞.
- Window close removes it from the open-window list.
- Taskbar renders the open-window list.
- Title bar drag moves the window on desktop view.

## Taskbar

- Start button is green.
- Open window buttons are blue rectangles.
- Tray shows only time and minimal manager state such as level.

