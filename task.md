# Monday (7/20) Mission Checklist - COMPLETED

- `[x]` **1. Supabase Schema Expansion**
    - `[x]` Update `schema.sql` with `profiles` table (`id`, `user_id`, `name`, `student_type`, `department`)
    - `[x]` Update `schema.sql` with `chat_messages` table (`id`, `user_id`, `role`, `content`, `created_at`)
    - `[x]` Add RLS security policies for `profiles` and `chat_messages`
- `[x]` **2. Express Backend Supabase Integration**
    - `[x]` Install `@supabase/supabase-js` and `dotenv` in `backend`
    - `[x]` Create `backend/src/supabase.js` client helper and `.env.example`
    - `[x]` Add Chat Persistence API routes (`POST /api/chat`, `GET /api/chat`)
    - `[x]` Add Scanned Grades Persistence API routes (`POST /api/credits/save-grades`, `GET /api/credits/saved-grades`)
- `[x]` **3. Frontend Data Persistence (Vertical Slice)**
    - `[x]` Connect `CreditAnalytics.jsx` to load saved grades on mount so **page refresh retains data**
    - `[x]` Automatically save OCR-scanned grades to DB upon upload
- `[x]` **4. Architecture Visualization & Documentation**
    - `[x]` Add Mermaid system flow diagram to `README.md`
    - `[x]` Add explanation guide for presentation
