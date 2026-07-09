# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ShortsGen** is an AI-powered short-form content generation dashboard built for small business owners (소상공인) in South Korea who lack time and technical resources to create trending social media content.

### The Problem
- SNS trends (Reels/Shorts/TikTok) change weekly
- Small business owners are too busy with core operations to track trends and create videos
- Existing solutions require design/editing skills they don't have

### The Solution
A full-stack web dashboard where business owners:
1. Input basic store info (category, location, signature menu)
2. Review AI-analyzed real-time trends (KoBERT semantic matching)
3. Upload one product photo → AI pipeline auto-generates optimized 15-second video
4. One-click publish to Instagram/TikTok

### Key Metrics
- Focus on **Destination CTR** (link clicks to business), not just view counts
- Success factors: Strong audio hook (0-3 sec) + CTA button in outro

---

## Architecture Overview

### Full-Stack Structure
```
ShortsGen/
├── frontend/              # React + Vite Dashboard (THIS REPO FOCUS)
│   ├── src/
│   │   ├── App.jsx       # Main routing: Home & Generate views
│   │   ├── main.jsx      # Entry point
│   │   ├── index.css     # Global styles + Tailwind setup
│   │   └── assets/
│   ├── vite.config.js    # Proxy /api to backend server
│   └── package.json
│
├── backend/              # Node.js + Express (separate repo/directory)
│   ├── src/server.js     # API endpoints & pipeline orchestration
│   └── package.json      # Dependencies: express, @supabase/supabase-js
│
└── CLAUDE.md
```

### Tech Stack
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18.3 + Vite 5 | Dashboard UI |
| Styling | Tailwind CSS 4.3 | Utility-first design |
| Icons | Lucide React 1.23 | Icon library |
| Backend | Node.js + Express | API & pipeline orchestration |
| Database | Supabase (PostgreSQL) | Store info, generated reels, orders |
| Vision AI | YOLOv8 | Object detection & smart cropping |
| NLP | KoBERT | Korean semantic matching for trends |
| TTS | External API | Voice-over generation |
| Video | FFmpeg | Audio/video rendering |

---

## User Journey (6-Step Flow)

```
Step 1: Store Setup (Setup Page)
  └─ Input: business category, location, signature menu

Step 2: Real-time Trend Review (Home Dashboard)
  └─ Display: Beautiful profile card, trending hashtags, search volume trends

Step 3: Campaign Planning (Generate)
  └─ Select: promotion purpose + video mood (checkboxes + radio)

Step 4: Image Upload (Generate)
  └─ Upload: single product photo via drag-and-drop

Step 5: AI Pipeline Execution (Generate)
  └─ Sequence:
     1. YOLOv8 smart crop
     2. KoBERT trend-to-caption matching
     3. TTS voice generation
     4. FFmpeg video rendering

Step 6: Review & Publish (Generate)
  └─ Preview: final 9:16 vertical video
  └─ Action: one-click Instagram/TikTok publish
```

---

## Commands

All commands run from their respective directories.

### Frontend
```bash
cd frontend

npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build to frontend/dist
npm run preview      # Preview production build locally
npm run lint         # Check code with ESLint
npm run lint -- --fix # Auto-fix linting issues
```

### Backend (Reference)
```bash
cd backend

npm start            # Start Express server (http://localhost:5000)
```

---

## Frontend Project Structure

### Target State (Multi-Page Architecture)
```
frontend/src/
├── App.jsx              # Router setup
├── main.jsx             # Entry point
├── index.css            # Tailwind + CSS Variables (Dabang Theme)
└── pages/
    ├── Dashboard.jsx    # Home dashboard with Profile Card & Trends
    ├── Setup.jsx        # Store information onboarding
    ├── Generate.jsx     # AI Pipeline (Planning, Upload, Preview)
    └── Archive.jsx      # Generated reels history
```

### Components Breakdown (by Page)
1. **Sidebar (Common)**
   - Navigation (Home, Generate, Archive, Setup)
   - ShortsGen Pro Badge

2. **Dashboard.jsx (Home)**
   - Store Profile Card (saved info)
   - Real-time trend analysis (Hashtags, Charts)

3. **Setup.jsx**
   - Detailed store info form (Category, signature menu, photo upload)

4. **Generate.jsx**
   - Left: Campaign Planning (Checkboxes/Radios) & Image Upload
   - Right: 9:16 Video Preview & Publish CTA

5. **Archive.jsx**
   - Grid of previously generated videos with status badges

---

## Design System & Styling

### Key Design Patterns
**Consistency Rule:** All new UI must follow these patterns:

| Element | Pattern | Example |
|---------|---------|---------|
| Cards/Sections | `rounded-3xl p-8 shadow-block border border-borderLine` | Profile setup card |
| Buttons | `rounded-2xl font-bold transition-all shadow-md` | "Create reel" button |
| Inputs | `rounded-2xl border border-borderLine py-4 px-4` | Category input field |
| Layout max-width | `max-w-5xl mx-auto w-full` | Main content container |
| Icon + Text | `flex items-center gap-2` | Sidebar nav buttons |
| Responsive grids | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` | Trend cards |

### Color Tokens
Used throughout JSX (e.g., `bg-primary`, `text-textMuted`):
- `primary` – Main brand color (blue)
- `secondary` – Accent color (teal)
- `textMain` – Primary text (#2D3748)
- `textMuted` – Secondary text (lighter)
- `borderLine` – Border color
- `surface` – Card background
- `background` – Page background (#F0F4F8)

**Note:** Colors are hardcoded Tailwind classes. For future refactoring, extract to Tailwind config or CSS variables.

### Typography
- **Font:** Inter (imported from Google Fonts)
- **Weights:** 400 (normal), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)
- **Usage:** Larger titles use `font-extrabold`, button labels use `font-bold`

---

## 🚫 Strict Restrictions

### 1. No `any` Type
- If adopting TypeScript or JSDoc, **never use `any`**
- All types must be explicit and specific
- Example: Use `type { name: string; id: number }` instead of `any`

### 2. No External UI Component Libraries
- **Forbidden:** Shadcn/ui, MUI, Ant Design, Semantic UI, Bootstrap, etc.
- **Required:** Build all UI from scratch using **Tailwind CSS utility classes**
- **Rationale:** Maintain design consistency & avoid library conflicts
- **When to request:** Must have explicit written agreement before installing any UI library

---

## Development Workflow

### Starting Development
```bash
# Terminal 1: Frontend
cd frontend
npm run dev

# Terminal 2: Backend (if needed)
cd backend
npm start
```

### Making Changes
1. **Add UI:** Edit App.jsx or create new components in `src/components/` (once views exceed 200 lines)
2. **Style:** Use only Tailwind classes; follow design patterns above
3. **Test:** Click sidebar buttons, test drag-drop, verify view transitions
4. **Lint:** `npm run lint -- --fix` before committing
5. **Build:** `npm run build` to test production build

### File Organization Rules
- **Under 200 lines:** Keep component inline (current App.jsx pattern)
- **Over 200 lines:** Extract to `src/components/ComponentName.jsx`
- **Shared utilities:** Create `src/utils/` or `src/api/` as needed
- **No index.js exports:** Import directly from component files

---

## API Integration (Backend Connection)

### Current State
- All trend data and pipeline interactions are **mocked** in frontend
- Backend Express server is ready to receive POST requests

### When Integrating Backend
Create `src/api/client.js`:
```javascript
// Example structure
export async function fetchTrends(storeInfo) {
  const response = await fetch('/api/trends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(storeInfo)
  });
  return response.json();
}

export async function uploadImageAndGenerate(file, planningData) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('planningData', JSON.stringify(planningData));
  
  const response = await fetch('/api/generate', {
    method: 'POST',
    body: formData
  });
  return response.json();
}

export async function pollRenderStatus(jobId) {
  const response = await fetch(`/api/render-status/${jobId}`);
  return response.json();
}
```

### Vite Proxy Configuration
The `vite.config.js` should proxy `/api` calls:
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
```

---

## State Management Strategy

### Current: Local Component State
Using React `useState` for:
- Current view ('home' vs 'generate')
- Selected image in upload
- Form inputs (category, location)

### Future: When to Upgrade
- **Context API:** If views need to share state (user profile, generated videos)
  - Use `useContext()` + `useReducer()` for manageable state
- **External store:** Only if Context becomes unwieldy; avoid Redux/Zustand unless explicitly required

**Rule:** Don't add global state management until you have 3+ pieces of state needed across 2+ views.

---

## Database Schema (Reference)

Backend will manage these Supabase tables:

### `orders` (Top-level order headers)
```sql
id          BIGINT PRIMARY KEY
store_id    BIGINT (foreign key to stores)
created_at  TIMESTAMP
order_items: [array of order_item records]
```

### `order_items` (Itemized data)
```sql
id          BIGINT PRIMARY KEY
order_id    BIGINT (foreign key → orders.id ON DELETE CASCADE)
product_name TEXT
quantity    INT
created_at  TIMESTAMP
```

### `generated_reels` (Published videos)
```sql
id          BIGINT PRIMARY KEY
store_id    BIGINT
video_url   TEXT
hashtags    TEXT[]
published_at TIMESTAMP
platform    TEXT ('instagram' | 'tiktok')
```

---

## Common Development Tasks

### Adding a New View
1. Create a new function component in App.jsx (e.g., `const MyView = () => (...)`)
2. Add button in Sidebar that calls `setCurrentView('myview')`
3. Render via `{currentView === 'myview' ? <MyView /> : ...}`
4. Once code exceeds 200 lines, extract to `src/components/MyView.jsx`

### Integrating a New Trend Data Source
1. Update backend crawler to fetch from new source
2. Add API endpoint `/api/trends` returning `{ hashtags: [...], searchVolume: [...] }`
3. In HomeView, call `fetchTrends()` on mount via `useEffect()`
4. Update rendered trend cards with real data

### Handling Video Upload Errors
1. Add error state: `const [uploadError, setUploadError] = useState(null)`
2. Wrap upload in try/catch, set error message
3. Display error banner: `{uploadError && <div className="bg-red-100 text-red-800">...</div>}`

### Testing Pipeline Flow
1. Upload image to GenerateView
2. Mock pipeline status updates (skeleton UI → completion ✓)
3. Verify video preview renders with correct captions
4. Test publish button (currently POST to `/api/publish`)

---

## Linting & Code Quality

### ESLint Configuration
Defined in `eslint.config.js`:
- **Base:** @eslint/js recommended rules
- **React:** react plugin (best practices, JSX validation)
- **React Hooks:** Validates dependency arrays, Hook usage patterns
- **React Refresh:** Warns about non-component exports

### Before Committing
```bash
npm run lint -- --fix
```

Auto-fixes: unused imports, semicolons, whitespace. Review any remaining warnings.

---

## Performance Considerations

### Image Upload
- Compress images client-side before sending to backend
- Show upload progress with progress bar (future enhancement)
- Support JPG, PNG, MP4 formats

### Video Rendering
- Rendering is backend-only (FFmpeg)
- Frontend should poll `/api/render-status/{jobId}` every 2-5 seconds
- Show skeleton UI while waiting (prevents user confusion)
- Display estimated time-to-completion if available

### Long-Running Operations
- Don't block UI during API calls
- Use loading states and disable buttons during submission
- Consider Toast notifications for success/error feedback (build custom, no toast library)

---

## Troubleshooting

### Dev Server Won't Start
```bash
# Clear node_modules and reinstall
rm -r node_modules
npm install
npm run dev
```

### Tailwind Classes Not Applied
- Restart dev server (HMR doesn't catch all CSS changes)
- Verify class name syntax: `rounded-3xl` not `rounded-lg-3xl`
- Check that Tailwind is imported in `index.css` (@tailwind directives)

### Vite Proxy to Backend Failing
- Ensure backend is running on port 5000: `npm start` from backend/
- Check vite.config.js has proxy configured
- Look for CORS issues in backend console

---

## Browser & Environment

- **Target Browsers:** Chrome, Safari, Firefox, Edge (modern versions)
- **Node Version:** 16+ (check package.json `engines` if specified)
- **React Version:** 18.3.1 (functional components + Hooks)
- **Vite Version:** 5.4.10

---

## Known Limitations & Future Work

1. **No Mobile Testing:** Responsive CSS exists but not tested on actual mobile devices
2. **Mocked Pipeline:** All trend data and upload flows are mock data
3. **No State Persistence:** Closing app loses all entered data (will need backend/localStorage)
4. **Single-File App:** Will need refactoring as views/complexity grows
5. **No Error Handling:** Add user-facing error messages when backend integration starts
6. **No Testing Suite:** Consider Jest + React Testing Library later
7. **No Offline Support:** Requires internet connection and backend availability

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/App.jsx` | Main component (Sidebar + views) |
| `frontend/src/index.css` | Tailwind + font imports + globals |
| `frontend/vite.config.js` | Build config + backend proxy |
| `frontend/eslint.config.js` | Linting rules |
| `docs/plan.md` | Detailed user journey (6 steps) |
| `pr_description.md` | Technical architecture & KoBERT strategy |

---

## External Resources

- [React 18 Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)
- [KoBERT Paper](https://arxiv.org/abs/2001.11258) (reference for backend)
- [YOLOv8 Docs](https://docs.ultralytics.com/models/yolov8/) (backend reference)

---

## Related Documentation

- **User Journey Details:** See `/docs/plan.md` for 6-step scenario breakdown
- **System Architecture:** See `/pr_description.md` for full tech stack & KoBERT algorithm overview
- **PR Template:** See `/.github/pull_request_template.md` for submission guidelines
