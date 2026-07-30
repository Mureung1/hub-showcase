# Final QA report — link-driven group-buy flow

Overall: PASS WITH LIMITATION

Limitation: no browser backend was exposed to this task (`agent.browsers.list()` returned `[]`). Interactive visual assertions were therefore validated using live HTTP responses, executable domain probes, passing automated tests, and exact source/render-path inspection. No persistent records were created.

## Results

| Priority | Scenario | Result | Evidence |
|---|---|---|---|
| P0 | Large search (900 chars) | PASS | `search-calculation-url.txt`: completes, returns 0 exact and 3 ranked recommendations against 6 live records. |
| P0 | Empty result + recommendations section | PASS (nonvisual) | `search-calculation-url.txt`: exact=0, recommendations=0; `source-assertions.txt`: recommendation section and explicit empty panel both render for a nonempty query. |
| P0 | Query handoff to create | PASS (source path) | `source-assertions.txt`: search query saved to `campus-cart-draft-name`; create page reads it into `initialName` and clears after successful creation. |
| P0 | Link create fields | PASS (source/tests) | `source-GroupBuyEditor.jsx.txt`: preview result maps sourceUrl/title/imageUrl/unitPrice into editable form fields; relevant product-preview tests pass in `npm-test.txt`. |
| P0 | 15000 / 1 / 50000 => 4 and Apply | PASS | `search-calculation-url.txt`: executable calculation returns 4; `source-assertions.txt`: Apply sets `targetPeople` to suggested target and `shippingFee` to 0. |
| P0 | Broken/unsafe URL fallback | PASS | `search-calculation-url.txt`: javascript, file, loopback, metadata IP all rejected; editor catch path preserves manual form and shows an error/fallback message (`source-GroupBuyEditor.jsx.txt`). |
| P0 | Image fallback | PASS (source/tests) | `source-assertions.txt`: unsafe/failed image switches to labelled fallback; `<img onError>` records failed URL. |
| P1 | Existing list | PASS | Live `GET /api/group-buys` returned 200 with 6 records (`api-group-buys.json`). |
| P1 | Existing detail | PASS | Live detail GET returned 200 for an existing record (`api-existing-detail.txt`). |
| P1 | Test/lint/build | PASS | `static-gates-summary.txt`: test=0 lint=0 build=0. |

## Integrity

- No create/update/delete endpoint was called.
- Temporary executable probe was removed.
- Evidence-only files remain in this directory.
