import { once } from "node:events";

import { app } from "../backend/app.js";

const server = app.listen(0, "127.0.0.1");

try {
  await once(server, "listening");
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      mode: "quick",
      maxMissingIngredients: 1,
      batchSize: 3,
      batchNumber: 1,
      excludedRecipeFingerprints: [],
      allergens: [],
      excludedIngredients: [],
      dietaryPreferences: [],
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    console.error(JSON.stringify({ status: response.status, result }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({
      status: response.status,
      meta: result.meta,
      recipes: result.recipes.map((recipe) => ({
        name: recipe.name,
        dishType: recipe.dishType,
        cookingTime: recipe.cookingTime,
        missingIngredientCount: recipe.missingIngredients.length,
      })),
    }, null, 2));
  }
} finally {
  server.close();
  await once(server, "close");
}
