import {
  DEFAULT_NAGGING_TONE,
  instantSuggestionPriority,
  mockInstantNaggingMessages,
  mockNaggingRules,
} from "../data/mockNaggingRules";

function findMatchingRule(trigger, selectedIngredient) {
  return [...mockNaggingRules]
    .sort((a, b) => b.priority - a.priority)
    .find((rule) => rule.trigger === trigger && (!rule.conditions.isInstant || selectedIngredient?.isInstant));
}

function getSuggestedIngredients(ingredients, selectedIngredient) {
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  return instantSuggestionPriority
    .map((id) => ingredientById.get(id))
    .filter((ingredient) => ingredient && ingredient.id !== selectedIngredient.id)
    .slice(0, 2);
}

export function getNaggingMessage({ trigger, selectedIngredient, ingredients, tone = DEFAULT_NAGGING_TONE }) {
  const rule = findMatchingRule(trigger, selectedIngredient);
  if (!rule) return null;

  const suggestedIngredients = getSuggestedIngredients(ingredients, selectedIngredient);
  const suggestionNames = suggestedIngredients.map((ingredient) => ingredient.name);
  const suggestionLabel = suggestionNames.join("·");
  const messages = mockInstantNaggingMessages[tone] ?? mockInstantNaggingMessages[DEFAULT_NAGGING_TONE];
  const message = suggestionNames.length
    ? messages[0].replace("{suggestions}", suggestionLabel)
    : "간단히 먹고 싶은 날이군요. 다음 장보기에는 계란이나 채소를 조금 챙겨보세요.";

  return {
    triggerType: "instantSelected",
    targetIngredientId: selectedIngredient.id,
    tone,
    title: "또 라면이에요?",
    message,
    suggestedIngredients,
    primaryAction: suggestionNames.length ? {
      label: `${suggestionLabel} 라면으로 먹기`,
      action: "showImprovedRecipe",
    } : null,
    secondaryAction: {
      label: "그냥 라면 먹기",
      action: "continueOriginalSelection",
    },
  };
}

