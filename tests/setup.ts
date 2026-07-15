import { config } from 'dotenv';
import { configureFastCheck } from './helpers/pbt';

// Load environment variables from .env.local before any test runs so the
// Supabase client helpers (which read process.env directly) can connect to the
// configured project. This runs once per test file via Vitest's setupFiles.
config({ path: '.env.local' });

// Apply the shared fast-check run count (>=100 per design.md Testing Strategy)
// globally, so every property-based test inherits it without per-test setup.
configureFastCheck();
