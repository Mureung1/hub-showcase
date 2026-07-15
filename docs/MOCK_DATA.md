# Mock Data Guide

This document describes the mock data used while the React screens are built before the backend API is connected.

## Source files

- Menu details: `src/App.jsx` → `menusByFilter`
- Category recommendation response: `src/services/recommendations.js`
- Ingredient registration response: `src/services/ingredients.js`

## Menu shape

```js
{
  id: "tofu-kimchi-bowl",
  name: "두부 김치 덮밥",
  time: "15분",
  balance: "탄수화물 + 단백질 균형",
  level: "쉬움",
  used: ["두부", "김치", "밥", "계란"],
  missing: ["대파"],
  steps: ["..."],
}
```

`used` and `missing` together are the menu's required ingredients. The UI compares them with the current `ingredients` state every time it renders.

## Current ingredient comparison rule

1. Registered ingredient names are trimmed, spaces are removed, and lowercase is used for comparison.
2. A required ingredient that exists in the refrigerator is displayed as an owned ingredient.
3. A required ingredient that does not exist is displayed as a missing ingredient.
4. Adding an ingredient such as `대파` updates the recommendation card and recipe detail immediately.

## Temporary error checks

- Registering an ingredient named `오류 테스트` simulates an ingredient registration error.
- Keeping an ingredient named `오류 테스트` simulates a recommendation loading error.

These checks are only for the React mock phase. Replace the mock service functions with real API calls after the backend is ready.
