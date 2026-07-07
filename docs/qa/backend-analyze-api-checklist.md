# Backend Analyze API QA Checklist

- `npm run dev:server` starts
- `GET /api/health` returns OK
- `POST /api/analyze` returns mock result
- `POST /api/analyze` with `mode=ai` returns `501 ai_not_implemented`
- response schema matches frontend `analysisResult` shape
- warnings use `{ type, message }`
- section limits apply
- duplicate calendar events are removed
- invalid/missing fields normalize safely
