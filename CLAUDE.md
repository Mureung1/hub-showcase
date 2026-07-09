# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ShortsGen** is an AI-powered short-form content generation dashboard designed for small business owners (소상공인) in Korea. The system automatically creates optimized, platform-ready short-form videos from product images using a sophisticated pipeline:

- **YOLOv8**: Smart object detection and cropping
- **KoBERT**: Korean NLP for trend-matching captions and hashtags  
- **TTS API**: Voice-over generation
- **FFmpeg**: Audio/video rendering

This repository contains the **frontend** (React + Vite dashboard). The backend AI pipeline is separate. The dashboard lets business owners upload product photos, review AI-analyzed trends, and auto-generate platform-ready videos for Instagram/TikTok.

### Project Context
- **User goal**: Reduce content creation burden for small business owners with zero technical or design expertise
- **Key differentiator**: KoBERT-powered semantic matching ensures captions/hooks are contextually relevant, not just keyword-matched
- **Performance metrics**: Focus on "Destination CTR" (link clicks to business), not just view counts

## Commands

All commands run from the `frontend/` directory.

### Development
```bash
npm run dev          # Start dev server with HMR (http://localhost:5173 default)
npm run build        # Production build to frontend/dist
npm run preview      # Preview prod build locally
npm run lint         # Run ESLint on src/**/*.{js,jsx}
```

## Project Structure

```
frontend/
├── src/
│   ├── App.jsx           # Main app component (sidebar + views)
│   ├── main.jsx          # Entry point
│   ├── index.css         # Global styles + Tailwind
│   ├── App.css           # Component-level styles (minimal)
│   └── assets/           # Static assets
├── vite.config.js        # Vite build config
├── eslint.config.js      # ESLint rules (React 18 + React Hooks)
└── package.json          # Dependencies

No components directory yet—App.jsx contains all views inline (Sidebar, HomeView, GenerateView).
```

## Architecture & Key Design Decisions

### Single-File Architecture (Current)
App.jsx contains three nested components:
- **Sidebar**: Navigation and user info (store profile)
- **HomeView**: Dashboard homepage with profile setup and real-time trend analysis
- **GenerateView**: Image upload + video rendering pipeline UI

**Why this works now**: Small scope (two main views, minimal interactivity). As features grow, refactor to `src/components/` with separate files per component.

### View Management
Uses React `useState` to toggle between 'home' and 'generate' views. No router yet (react-router-dom is installed but not used). Once feature scope expands, migrate to React Router for:
- URL-based navigation (e.g., `/dashboard/generate`)
- History/back button support
- Bookmarkable states

### Styling
- **Tailwind CSS**: Utility-first for spacing, responsive layouts, interactive states
- **Custom colors**: Defined in CSS (`.index.css` imports fonts)
- **Color tokens**: Used throughout JSX (e.g., `bg-primary`, `text-textMuted`)

Look for color definitions in `index.css` and component class names for the active design token mapping.

### State Management
Currently no centralized state (just local component useState). If feature scope expands:
- Consider Context API for cross-view data (user profile, generated videos)
- Don't add Redux/Zustand yet—only if needed to avoid prop drilling

### Future Backend Integration Points
The dashboard will eventually call a backend API for:
1. **Trend analysis**: Real-time SNS trend data (currently hardcoded: "빵지순례", "겉바속촉", "연남동데이트")
2. **Image upload & pipeline trigger**: POST to backend AI pipeline
3. **Status polling**: Poll for video render completion and results
4. **Social media publishing**: Instagram/TikTok integration

For now, UI states are mocked (e.g., `selectedImage` sets upload state without actual upload). Replace with actual API calls when backend is ready.

## Development Workflow

1. **Start dev server**: `npm run dev` → opens http://localhost:5173
2. **Make UI changes**: Edit App.jsx or create new components in `src/components/`
3. **Test interactivity**: Click sidebar buttons, drag-drop interactions, view transitions
4. **Check styling**: Inspect with browser DevTools; Tailwind classes are compiled at build time
5. **Lint before commit**: `npm run lint` (or use IDE auto-fix)
6. **Build for production**: `npm run build` → outputs to `dist/`

## Linting & Code Quality

ESLint is configured with:
- **@eslint/js** + **eslint-plugin-react** for React best practices
- **react-hooks** for Hook rules (e.g., dependencies array validation)
- **react-refresh** for HMR warnings

Run `npm run lint` to check or `npm run lint -- --fix` to auto-fix issues.

## Design System Notes

The UI follows a cohesive design with:
- **Sidebar**: Sticky, 16rem wide, shadow-boxed, persistent user profile section
- **Cards**: Rounded-3xl, shadow-block borders, gap-6 internal padding
- **Buttons**: Rounded-2xl, gradient backgrounds (primary), shadow-md hover effects with subtle lift
- **Input fields**: Rounded-2xl, border-based, icon support (absolute positioned inside)
- **Responsive**: Grid layouts use `md:` and `lg:` breakpoints

When adding new UI, match existing patterns: use `rounded-3xl`/`rounded-2xl`, `shadow-block`, `gap-*` for internal spacing, and `max-w-5xl mx-auto` for content width.

## Common Tasks

### Adding a New View
1. Create a new component function in App.jsx (e.g., `const MyView = () => (...)`)
2. Add navigation button in Sidebar
3. Add case to `setCurrentView()` state
4. Render via `{currentView === 'myview' ? <MyView /> : ...}`

Once views exceed ~200 lines, move to `src/components/MyView.jsx`.

### Integrating Backend API
1. Create `src/api/client.js` with fetch/axios base client
2. Add API functions (e.g., `fetchTrends()`, `uploadImage()`, `pollRenderStatus()`)
3. Call from views via `useEffect()` and state updates
4. Add loading/error states (skeleton UI, error toast)

### Updating Colors/Design Tokens
1. Colors are currently hardcoded in Tailwind classes
2. For future: extract to Tailwind config or CSS custom properties
3. Common tokens: `primary` (blue), `secondary` (teal), `textMain`, `textMuted`, `borderLine`, `surface`, `background`

## Browser & Environment

- **Target**: Modern browsers (Chrome, Safari, Firefox, Edge)
- **Node**: 16+ (check `package.json` engines if needed)
- **React**: 18.3.1 (uses functional components + Hooks)

## Known Limitations & TODOs

1. **No real backend integration**: Trend data and image upload/processing are mocked
2. **Single-file components**: Will need refactoring as features grow
3. **No state persistence**: Closing the app loses all state (will need localStorage or backend sync)
4. **No error handling**: Add try/catch and user-facing error messages when API integration starts
5. **No testing**: Consider adding Jest + React Testing Library when complexity increases
6. **Mobile responsiveness**: CSS supports md/lg breakpoints but hasn't been tested on actual mobile devices

## References

- [React 18 Docs](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide React Icons](https://lucide.dev)
- [Project Context (PR_Project.md)](/PR_Project.md)

