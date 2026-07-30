# Link-driven group-buy QA scenario inventory

## P0
1. Large product search returns usable candidates and remains responsive.
2. Empty search result renders an explicit empty state plus recommendations section.
3. Product-link query handoff populates the group-buy create flow.
4. Create form fields are populated from product preview; calculation 15000 / 1 / 50000 yields 4 applicants.
5. Broken and unsafe URLs fall back safely without crash or unsafe navigation.
6. Broken product image uses the image fallback.

## P1
7. Existing group-buy list still renders.
8. Existing group-buy detail still opens and renders expected information.
9. Static gates: npm test, npm run lint, npm run build.
