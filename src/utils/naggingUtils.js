import { getIngredientTags } from "../../shared/ingredientTags.js";
import {
  DEFAULT_NAGGING_TONE,
  mockInstantNaggingMessages,
  mockNaggingRules,
} from "../data/mockNaggingRules.js";

function findMatchingRule(trigger, selectedIngredient) {
  const selectedTags = getIngredientTags(selectedIngredient);
  const isInstant = selectedIngredient?.isInstant || selectedTags.includes("processing:instant");
  return [...mockNaggingRules]
    .sort((a, b) => b.priority - a.priority)
    .find((rule) => rule.trigger === trigger && (!rule.conditions.isInstant || isInstant));
}

function getSuggestedIngredients(ingredients, selectedIngredient) {
  return ingredients
    .filter((ingredient) => ingredient.id !== selectedIngredient.id)
    .map((ingredient) => ({ ingredient, tags: getIngredientTags(ingredient) }))
    .filter(({ tags }) => tags.includes("nutrition:vegetable") || tags.includes("nutrition:protein"))
    .sort((a, b) => Number(b.tags.includes("nutrition:vegetable")) - Number(a.tags.includes("nutrition:vegetable")))
    .map(({ ingredient }) => ingredient)
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
  const titles = { gentle: "조금 더 든든하게 먹어볼까요?", playful: "이번 주에 또 간편식이에요?", direct: "인스턴트 선택이 이어지고 있어요" };

  return {
    triggerType: "instantSelected",
    targetIngredientId: selectedIngredient.id,
    tone,
    title: titles[tone] ?? titles.gentle,
    message,
    suggestedIngredients,
    primaryAction: suggestionNames.length ? {
      label: `${suggestionLabel} 함께 먹기`,
      action: "showImprovedRecipe",
    } : null,
    secondaryAction: {
      label: "원래 선택 계속하기",
      action: "continueOriginalSelection",
    },
  };
}
