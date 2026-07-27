**Findings**

- [P3] Reference artwork is not reproduced as a store photograph.
  Location: selected-store map card.
  Evidence: the reference uses a circular storefront photo; the rendered LocalTwin card uses the existing category icon because no verified store image asset is available.
  Impact: visual warmth differs, but no data meaning or interaction is lost.
  Fix: add verified, licensed store thumbnails only when an image source and attribution policy are defined.

- [P3] The API loading state cannot show the final score cards until the analysis request completes.
  Location: bottom quick metrics and selected-store card.
  Evidence: an outdated local API process returned an incomplete response, and the quick metrics previously used the same `자료 없음` text for a pending request and a completed unavailable value.
  Impact: users could mistake a slow API response for missing official data.
  Fix: the quick metrics now show `불러오는 중` only while the request is pending, read loaded flow/store values from the API response, and reserve `자료 없음` for a completed unavailable value. Restart the local API from the current source before visual verification.

**Open Questions**

- The three supplied screenshots are visual direction, not a one-to-one specification for the current three-column LocalTwin workspace. The implementation preserves the current live-map interaction model while applying the requested information hierarchy.

**Implementation Checklist**

- [x] Keep specialist labels and add keyboard-focusable `?` help for the key analysis terms.
- [x] Add the four-item bottom summary bar using live analysis values only.
- [x] Reorder the inspector so score and icon metrics precede the plain-language decision summary.
- [x] Add a selected-store map card with category, distance, score state, and an evidence action.
- [x] Convert the top map switch to actual map, density, and 3D-store modes.
- [x] Verify the store-card interaction in the browser and run the web test suite and production build.

**Comparison evidence**

- Source visual truth: `C:/Users/hi/AppData/Local/Temp/codex-clipboard-10e6b768-590f-4f95-8d19-2947a1af58e5.png`, `C:/Users/hi/AppData/Local/Temp/codex-clipboard-441a9a35-cbde-410d-be3c-ea1cc2f3a3f5.png`, and `C:/Users/hi/AppData/Local/Temp/codex-clipboard-599b45cb-9f9a-4e48-bc63-7f446e9d3a47.png`.
- Implementation: `http://127.0.0.1:5173/`, desktop browser viewport `1280 x 720`, LocalTwin density mode with the `조앤도슨` marker selected.
- Focused regions compared: bottom summary bar, top map-mode controls, selected-store card, and inspector hierarchy.
- Fonts/typography: retained the product's existing font and compact control sizes; labels are not replaced with simplified wording.
- Spacing/layout: added a floating bottom bar without changing the left-map-right workspace structure.
- Colors/tokens: retained the existing LocalTwin green, amber, and coral semantic colors.
- Image quality: no non-licensed image was fabricated; category icons deliberately stand in for missing photos.
- Copy/content: pending analysis uses `불러오는 중`; `자료 없음` is reserved for a completed response without that metric.

**Comparison history**

- Iteration 1: the local rendered UI was compared after the bottom bar, score cards, map tabs, and selected-store card were implemented. No actionable P0/P1 visual issue was found for the requested regions. The two P3 differences above remain intentional or dependent on unavailable API/image inputs.

**Final result**

passed
