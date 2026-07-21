import { useEffect, useMemo, useState } from "react";
import { getDefaultIngredientTags, getIngredientTags, INGREDIENT_TAG_LABELS } from "../shared/ingredientTags";
import "./App.css";
import IngredientForm from "./components/IngredientForm";
import NaggingMessage from "./components/NaggingMessage";
import CoachReactionModal from "./components/CoachReactionModal";
import { cookingMethodLabels, mockRecipes, recipeDifficultyLabels } from "./data/mockRecipes";
import { deleteIngredient, getIngredients, registerIngredient, updateIngredient } from "./services/ingredients";
import {
  getDaysRemaining,
  getExpirationSentence,
  getIngredientDueDate,
  isUrgentIngredient,
} from "./utils/expiration";
import {
  buildIngredientFromForm,
  formatIngredientQuantity,
  getIngredientCategoryLabel,
  getIngredientExpirationPresentation,
} from "./utils/ingredientUtils";
import { getNaggingMessage } from "./utils/naggingUtils";
import { getRecipeAvailability, getRecommendedRecipes } from "./utils/recipeUtils";
import { getCoachingTone, readMealChoiceHistory, recordMealChoice } from "./utils/mealChoiceHistory";

const storageLabels = { urgent: "먼저 먹기", all: "전체", fridge: "냉장", freezer: "냉동", room: "실온" };
const mainTabs = [
  ["fridge", "내 냉장고"],
  ["recommend", "식단 추천"],
  ["recipe", "레시피"],
  ["shopping", "구매 추천"],
];

function withObjectParticle(name) {
  const lastCharacterCode = name.charCodeAt(name.length - 1);
  const isHangulSyllable = lastCharacterCode >= 0xac00 && lastCharacterCode <= 0xd7a3;
  const hasFinalConsonant = isHangulSyllable && (lastCharacterCode - 0xac00) % 28 !== 0;
  return `${name}${hasFinalConsonant ? "을" : "를"}`;
}

function normalizeIngredientName(name) {
  return name.trim().replaceAll(" ", "").toLowerCase();
}

function getIngredientGroups(menu, ingredients) {
  const ownedNames = new Set(ingredients.map((ingredient) => normalizeIngredientName(ingredient.name)));
  const requiredIngredients = [...new Set([...(menu.used ?? []), ...(menu.missing ?? [])])];

  return {
    ownedIngredients: requiredIngredients.filter((ingredient) => ownedNames.has(normalizeIngredientName(ingredient))),
    missingIngredients: requiredIngredients.filter((ingredient) => !ownedNames.has(normalizeIngredientName(ingredient))),
  };
}

const menusByFilter = {
  balanced: [
    { id: "tofu-kimchi-bowl", badge: "냉장고 활용도 높음", name: "두부 김치 덮밥", time: "15분", balance: "탄수화물 + 단백질 균형", used: ["두부", "김치", "밥", "계란"], missing: ["대파"], summary: "임박 재료인 두부를 먼저 사용하고, 김치와 밥으로 든든하게 완성하는 한 그릇 메뉴입니다.", level: "쉬움", steps: ["두부는 키친타월로 물기를 제거한 뒤 먹기 좋은 크기로 자릅니다.", "팬에 김치를 볶고 두부를 넣어 3분 정도 더 익힙니다.", "밥 위에 볶은 두부 김치를 올리고 계란프라이를 얹습니다.", "대파가 있으면 잘게 썰어 마지막에 올려 향을 더합니다."], substitutes: "대파가 없다면 양파, 부추, 김가루로 향과 식감을 보완할 수 있습니다." },
    { id: "egg-rice", badge: "아침 식사 추천", name: "계란 간장밥", time: "8분", balance: "빠른 에너지 보충", used: ["계란", "밥"], missing: ["간장", "참기름"], summary: "바쁜 날에도 바로 만들 수 있는 초간단 메뉴입니다. 재료가 적어 자취생에게 잘 맞습니다.", level: "매우 쉬움", steps: ["따뜻한 밥을 그릇에 담습니다.", "계란프라이를 반숙으로 익혀 밥 위에 올립니다.", "간장과 참기름을 넣고 골고루 비빕니다."], substitutes: "참기름이 없으면 버터나 들기름을 조금 넣어도 고소한 맛을 낼 수 있습니다." },
    { id: "kimchi-soup", badge: "따뜻한 국물", name: "김치 두부국", time: "18분", balance: "가벼운 단백질 보충", used: ["김치", "두부"], missing: ["멸치육수", "양파"], summary: "김치와 두부를 중심으로 끓이는 국물 메뉴입니다. 남은 밥과 함께 먹기 좋습니다.", level: "보통", steps: ["냄비에 김치와 물을 넣고 8분 정도 끓입니다.", "두부와 양파를 넣고 중불에서 더 끓입니다.", "간을 보고 부족하면 소금이나 국간장을 조금 추가합니다."], substitutes: "멸치육수가 없다면 물에 참치액, 다시다, 간장을 소량 넣어 감칠맛을 보완할 수 있습니다." },
  ],
  quick: [
    { id: "quick-egg-rice", badge: "최단 시간", name: "계란 간장밥", time: "8분", balance: "탄수화물 + 단백질", used: ["계란", "밥"], missing: ["간장", "참기름"], summary: "설거지와 조리 시간을 줄이고 싶을 때 가장 빠르게 만들 수 있는 메뉴입니다.", level: "매우 쉬움", steps: ["밥을 데웁니다.", "계란프라이를 만듭니다.", "간장과 참기름을 넣고 비빕니다."], substitutes: "참기름 대신 버터를 넣으면 부드러운 맛이 납니다." },
    { id: "kimchi-fried-rice", badge: "팬 하나 조리", name: "김치 볶음밥", time: "12분", balance: "든든한 한 끼", used: ["김치", "밥", "계란"], missing: ["스팸"], summary: "김치와 밥만 있어도 만들 수 있고, 계란을 올리면 포만감이 좋아집니다.", level: "쉬움", steps: ["김치를 잘게 썰어 볶습니다.", "밥을 넣고 고르게 볶습니다.", "계란프라이를 올려 마무리합니다."], substitutes: "스팸이 없다면 참치캔, 햄, 두부를 넣어도 좋습니다." },
    { id: "tofu-scramble", badge: "가벼운 식사", name: "두부 계란 스크램블", time: "10분", balance: "단백질 중심", used: ["두부", "계란"], missing: ["소금", "후추"], summary: "두부를 먼저 소비하면서 단백질을 챙길 수 있는 간단한 팬 조리 메뉴입니다.", level: "쉬움", steps: ["두부를 으깨 물기를 제거합니다.", "계란과 섞어 팬에 볶습니다.", "소금과 후추로 간합니다."], substitutes: "후추가 없다면 김가루나 깨를 뿌려 풍미를 더할 수 있습니다." },
  ],
  urgent: [
    { id: "urgent-tofu", badge: "D-2 두부 우선", name: "두부 김치 덮밥", time: "15분", balance: "단백질 + 탄수화물", used: ["두부", "김치", "밥"], missing: ["대파"], summary: "소비 권장일이 가장 가까운 두부를 중심으로 추천된 메뉴입니다.", level: "쉬움", steps: ["두부를 굽습니다.", "김치를 볶습니다.", "밥 위에 함께 올려 덮밥으로 완성합니다."], substitutes: "대파 대신 양파나 김가루를 사용해도 좋습니다." },
    { id: "urgent-soup", badge: "두부 넉넉히 사용", name: "두부 계란국", time: "14분", balance: "따뜻한 단백질 보충", used: ["두부", "계란"], missing: ["국간장", "대파"], summary: "남은 두부를 많이 넣어 빠르게 소비할 수 있는 따뜻한 국물 메뉴입니다.", level: "쉬움", steps: ["물을 끓이고 두부를 넣습니다.", "계란을 풀어 천천히 붓습니다.", "국간장으로 간합니다."], substitutes: "국간장이 없으면 소금과 간장 소량을 섞어 간을 맞춥니다." },
    { id: "urgent-pan-tofu", badge: "반찬형 추천", name: "두부 부침", time: "12분", balance: "단백질 반찬", used: ["두부", "계란"], missing: ["부침가루"], summary: "두부를 도톰하게 부쳐 밥과 김치에 곁들이기 좋은 반찬형 메뉴입니다.", level: "쉬움", steps: ["두부의 물기를 제거합니다.", "계란물을 입혀 팬에 굽습니다.", "앞뒤로 노릇하게 익힙니다."], substitutes: "부침가루가 없다면 계란물만 입혀도 충분히 부칠 수 있습니다." },
  ],
  nutrition: [
    { id: "protein-bowl", badge: "영양 균형", name: "두부 계란 비빔밥", time: "16분", balance: "탄수화물 + 단백질 + 채소", used: ["두부", "계란", "밥", "김치"], missing: ["상추", "고추장"], summary: "밥, 계란, 두부에 채소를 더해 균형 잡힌 한 끼로 구성한 메뉴입니다.", level: "쉬움", steps: ["두부와 계란을 각각 익힙니다.", "밥 위에 김치와 재료를 올립니다.", "고추장을 넣고 비빕니다."], substitutes: "상추가 없다면 깻잎, 양배추, 오이를 넣어도 좋습니다." },
    { id: "warm-soup-set", badge: "가벼운 균형식", name: "김치 두부국 정식", time: "20분", balance: "국물 + 밥 + 단백질", used: ["김치", "두부", "밥"], missing: ["양파", "버섯"], summary: "국물과 밥을 함께 구성해 부담 없는 저녁 식사로 보여주기 좋은 메뉴입니다.", level: "보통", steps: ["김치국을 먼저 끓입니다.", "두부와 채소를 넣습니다.", "밥과 함께 한 상으로 구성합니다."], substitutes: "버섯이 없다면 애호박이나 대파로 식감을 더할 수 있습니다." },
    { id: "light-scramble", badge: "저녁 추천", name: "두부 스크램블 플레이트", time: "13분", balance: "단백질 중심 가벼운 식사", used: ["두부", "계란", "김치"], missing: ["방울토마토"], summary: "탄수화물을 줄이고 싶을 때 두부와 계란을 중심으로 구성하는 메뉴입니다.", level: "쉬움", steps: ["두부와 계란을 섞어 볶습니다.", "김치를 곁들입니다.", "토마토를 추가해 산뜻하게 마무리합니다."], substitutes: "방울토마토 대신 오이, 양배추, 사과 조각을 곁들여도 좋습니다." },
  ],
  instant: [
    { id: "ramen-improved", badge: "한 끼 코치 추천", name: "계란·대파 라면", time: "8분", balance: "계란과 채소로 보완", used: ["라면", "계란", "대파"], missing: [], summary: "라면 선택은 그대로 존중하면서 계란과 대파를 더해 조금 더 든든하게 구성한 mock 레시피입니다.", level: "매우 쉬움", steps: ["물을 끓이고 면과 수프를 넣습니다.", "면이 풀리면 계란을 넣고 대파를 송송 썰어 더합니다.", "계란이 익으면 불을 끄고 바로 먹습니다."], substitutes: "대파 대신 부추나 양파를 넣어도 좋아요." },
    { id: "ramen-basic", badge: "원래 선택", name: "기본 라면", time: "5분", balance: "간단한 한 끼", used: ["라면"], missing: [], summary: "추가 재료 없이 사용자의 원래 선택대로 조리하는 기본 라면 mock 레시피입니다.", level: "매우 쉬움", steps: ["물을 끓입니다.", "면과 수프를 넣고 표시된 시간만큼 끓입니다.", "불을 끄고 그릇에 담습니다."], substitutes: "다음에는 계란이나 채소를 함께 준비해도 좋아요." },
  ],
};

const nutritionByMenuId = {
  "tofu-kimchi-bowl": { calories: "520 kcal", protein: "24 g", carbohydrates: "68 g" },
  "egg-rice": { calories: "430 kcal", protein: "16 g", carbohydrates: "61 g" },
  "quick-egg-rice": { calories: "430 kcal", protein: "16 g", carbohydrates: "61 g" },
  "protein-bowl": { calories: "560 kcal", protein: "29 g", carbohydrates: "72 g" },
  "ramen-improved": { calories: "mock 1인분", protein: "계란으로 보완", carbohydrates: "면 1개" },
  "ramen-basic": { calories: "mock 1인분", protein: "정보 없음", carbohydrates: "면 1개" },
};

const substitutesByMenuId = {
  "tofu-kimchi-bowl": [{ ingredient: "대파", alternatives: ["양파", "부추", "김가루"] }],
  "egg-rice": [{ ingredient: "참기름", alternatives: ["버터", "들기름"] }],
  "quick-egg-rice": [{ ingredient: "참기름", alternatives: ["버터"] }],
  "protein-bowl": [
    { ingredient: "상추", alternatives: ["깻잎", "양배추", "오이"] },
    { ingredient: "고추장", alternatives: ["간장", "참기름"] },
  ],
};
function App() {
  const [ingredients, setIngredients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ingredientError, setIngredientError] = useState("");

  const refreshIngredients = async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);
      setIngredientError("");
      setIngredients(await getIngredients());
    } catch (error) {
      console.error("재료 조회 오류:", error);
      setIngredientError(error.message ?? "재료를 불러오지 못했습니다.");
      throw error;
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshIngredients(true).catch(() => {});
  }, []);
  const [activeMainTab, setActiveMainTab] = useState("fridge");
  const [activeStorage, setActiveStorage] = useState("all");
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [selectedMood, setSelectedMood] = useState("noFire");
  const [includeOneMissing, setIncludeOneMissing] = useState(true);
  const [pendingRecipe, setPendingRecipe] = useState(null);
  const [coachReaction, setCoachReaction] = useState(null);
  const [isRecipeLoading, setIsRecipeLoading] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [initialFocusField, setInitialFocusField] = useState("name");
  const [sortOrder, setSortOrder] = useState("expiry");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [naggingMessage, setNaggingMessage] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "success" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState({ name: "", quantity: "", storage: "fridge", category: "egg", expiryDays: "5", tags: getDefaultIngredientTags("egg") });
  const [errors, setErrors] = useState({});

  const visibleIngredients = useMemo(() => {
    const filtered = ingredients.filter((item) => {
      if (activeStorage === "all") return true;
      if (activeStorage === "urgent") return isUrgentIngredient(getDaysRemaining(getIngredientDueDate(item)));
      return item.storage === activeStorage;
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === "recent") return ingredients.indexOf(a) - ingredients.indexOf(b);
      if (sortOrder === "name") return a.name.localeCompare(b.name, "ko");
      const aDays = getDaysRemaining(getIngredientDueDate(a)) ?? Number.POSITIVE_INFINITY;
      const bDays = getDaysRemaining(getIngredientDueDate(b)) ?? Number.POSITIVE_INFINITY;
      return aDays - bDays;
    });
  }, [activeStorage, ingredients, sortOrder]);
  const selectedMenu = useMemo(() => mockRecipes.find((menu) => menu.id === selectedMenuId) ?? Object.values(menusByFilter).flat().find((menu) => menu.id === selectedMenuId) ?? null, [selectedMenuId]);
  const recommendedCount = useMemo(() => getRecommendedRecipes({ recipes: mockRecipes, ingredients, selectedMood: "quick" }).filter(({ availability }) => availability.status === "available").length, [ingredients]);

  const flash = (text, type = "success") => {
    setMessage({ text, type });
    window.setTimeout(() => setMessage({ text: "", type: "success" }), 2200);
  };

  const resetForm = (storage = activeStorage) => {
    setFormValues({ name: "", quantity: "", storage: ["all", "urgent"].includes(storage) ? "fridge" : storage, category: "egg", expiryDays: "5", tags: getDefaultIngredientTags("egg") });
    setEditingIngredientId(null);
    setErrors({});
  };

  const openIngredientForm = () => {
    setActiveMainTab("fridge");
    resetForm(activeStorage);
    setInitialFocusField("name");
    setIsFormOpen(true);
  };

  const closeIngredientForm = () => {
    if (isSubmitting) return;
    setIsFormOpen(false);
    resetForm(activeStorage);
  };

  const handleFormChange = ({ target }) => {
    const { name, value } = target;

    setFormValues((current) => ({
      ...current,
      [name]: value,
      ...(name === "category" ? { tags: getDefaultIngredientTags(value) } : {}),
    }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const handleTagToggle = (tag) => {
    setFormValues((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
    }));
  };

  const handleFormBlur = ({ target }) => {
    const { name, value } = target;
    if (value !== "") return;

    const messages = {
      name: "재료명을 입력해 주세요.",
      quantity: "수량을 입력해 주세요.",
      expiryDays: "소비기한을 선택해 주세요.",
    };
    if (messages[name]) setErrors((current) => ({ ...current, [name]: messages[name] }));
  };

  const handleSubmitIngredient = async (event) => {
    event.preventDefault();
    const name = formValues.name.trim();
    const quantity = formValues.quantity.trim();
    const expiryDays = Number(formValues.expiryDays);
    const nextErrors = {};

    if (!name) nextErrors.name = "재료명을 입력해 주세요.";
    if (!quantity) nextErrors.quantity = "수량을 입력해 주세요.";
    if (formValues.expiryDays === "" || !Number.isInteger(expiryDays) || expiryDays < 0) nextErrors.expiryDays = "소비기한을 선택해 주세요.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const existingIngredient = ingredients.find((item) => item.id === editingIngredientId) ?? null;
    const ingredient = buildIngredientFromForm({ ...formValues, name, quantity }, existingIngredient);

    if (editingIngredientId) {
      setIsSubmitting(true);
      try {
        const { merged } = await updateIngredient(editingIngredientId, ingredient);
        await refreshIngredients();
        flash(merged ? "동일한 재고를 하나로 합쳤습니다." : "재료 정보를 수정했습니다.");
      } catch (error) {
        flash(error.message ?? "재료 수정에 실패했습니다. 다시 시도해 주세요.", "error");
        return;
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(true);
      try {
        const { merged } = await registerIngredient(ingredient);
        await refreshIngredients();
        flash(merged ? "동일한 재료의 수량을 합쳤습니다." : "내 냉장고에 새 재료를 추가했습니다.");
      } catch (error) {
        flash(error.message ?? "재료 등록에 실패했습니다. 다시 시도해주세요.", "error");
        return;
      } finally {
        setIsSubmitting(false);
      }
    }
    if (!["all", "urgent", formValues.storage].includes(activeStorage)) setActiveStorage(formValues.storage);
    setIsFormOpen(false);
    resetForm(formValues.storage);
  };

  const editIngredient = (ingredient, focusField = "name") => {
    setActiveMainTab("fridge");
    setEditingIngredientId(ingredient.id);
    setFormValues({ name: ingredient.name, quantity: formatIngredientQuantity(ingredient) === "보유 중" ? "1개" : formatIngredientQuantity(ingredient), storage: ingredient.storage, category: ingredient.category, expiryDays: String(Math.max(0, getDaysRemaining(getIngredientDueDate(ingredient)) ?? 180)), tags: getIngredientTags(ingredient) });
    setErrors({});
    setInitialFocusField(focusField);
    setOpenMenuId(null);
    setIsFormOpen(true);
  };

  const requestIngredientAction = (type, ingredient) => {
    setOpenMenuId(null);
    setConfirmAction({ type, ingredient });
  };

  const completeIngredientAction = async () => {
    if (!confirmAction) return;
    const { ingredient, type } = confirmAction;
    setIsSubmitting(true);

    try {
      await deleteIngredient(ingredient.id);
      await refreshIngredients();
      setConfirmAction(null);
      if (editingIngredientId === ingredient.id) resetForm();
      flash(type === "used" ? `${withObjectParticle(ingredient.name)} 모두 사용했어요.` : `${withObjectParticle(ingredient.name)} 삭제했어요.`);
    } catch (error) {
      setConfirmAction(null);
      flash(error.message ?? "재료 삭제에 실패했습니다. 다시 시도해 주세요.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectMenu = (menu) => {
    const selectedMenu = mockRecipes.find((item) => item.id === menu?.id) ?? Object.values(menusByFilter).flat().find((item) => item.id === menu?.id);

    setSelectedMenuId(selectedMenu?.id ?? null);
    setActiveMainTab("recipe");
    if (!selectedMenu) return;

    setIsRecipeLoading(true);
    window.setTimeout(() => setIsRecipeLoading(false), 350);
  };

  const handleIngredientSelect = (ingredient) => {
    setSelectedIngredient(ingredient);
    setOpenMenuId(null);

    const nextNaggingMessage = getNaggingMessage({
      trigger: "ingredientSelected",
      selectedIngredient: ingredient,
      ingredients,
      tone: getCoachingTone(readMealChoiceHistory(), { includeCurrentChoice: true }),
    });

    if (nextNaggingMessage) {
      setNaggingMessage(nextNaggingMessage);
      return;
    }

    setActiveMainTab("recommend");
  };

  const closeNaggingMessage = () => {
    setNaggingMessage(null);
    setSelectedIngredient(null);
    setPendingRecipe(null);
  };

  const continueWithRamen = (menuId) => {
    const menu = Object.values(menusByFilter).flat().find((item) => item.id === menuId);
    setNaggingMessage(null);
    setSelectedIngredient(null);
    setPendingRecipe(null);
    if (menu) {
      recordMealChoice({ recipeId: menu.id, selectedAt: new Date().toISOString(), isInstant: true });
      selectMenu(menu);
    }
  };

  const acceptNaggingSuggestion = () => {
    if (!pendingRecipe) {
      continueWithRamen("ramen-improved");
      return;
    }

    const recipe = pendingRecipe;
    setNaggingMessage(null);
    setSelectedIngredient(null);
    setPendingRecipe(null);
    recordMealChoice({ recipeId: recipe.id, selectedAt: new Date().toISOString(), isInstant: Boolean(recipe.isInstant) });
    selectMenu(recipe);
  };

  const handleRecipeSelect = (recipe) => {
    if (recipe.isInstant) {
      const ramenIngredient = ingredients.find((ingredient) => ingredient.isInstant || ingredient.name === "라면");
      if (ramenIngredient) {
        setPendingRecipe(recipe);
        setSelectedIngredient(ramenIngredient);
        setNaggingMessage(getNaggingMessage({ trigger: "ingredientSelected", selectedIngredient: ramenIngredient, ingredients, tone: getCoachingTone(readMealChoiceHistory(), { includeCurrentChoice: true }) }));
        return;
      }
    }

    setPendingRecipe(recipe);
    setCoachReaction(recipe.coachReaction);
  };

  const continueFromCoach = () => {
    const recipe = pendingRecipe;
    setCoachReaction(null);
    setPendingRecipe(null);
    if (recipe) {
      recordMealChoice({ recipeId: recipe.id, selectedAt: new Date().toISOString(), isInstant: Boolean(recipe.isInstant) });
      selectMenu(recipe);
    }
  };

  return (
    <div className="app-shell">
      <header className={`site-header ${activeMainTab === "fridge" ? "fridge-context" : ""}`}>
        <div className="header-spacer" aria-hidden="true" />
        <nav className="header-nav" aria-label="상단 메뉴">
          <button type="button">서비스 소개</button>
          {mainTabs.map(([id, label]) => <button key={id} type="button" className={activeMainTab === id ? "active" : ""} aria-current={activeMainTab === id ? "page" : undefined} onClick={() => setActiveMainTab(id)}>{label}</button>)}
        </nav>
        {activeMainTab !== "fridge" && <button className="header-cta" type="button" onClick={openIngredientForm}>재료 등록하기</button>}
      </header>

      <main>
        {activeMainTab === "fridge" && isLoading && (
          <div className="empty-board">재료를 불러오는 중입니다...</div>
        )}
        {activeMainTab === "fridge" && !isLoading && ingredientError && (
          <div className="empty-board" role="alert">{ingredientError}</div>
        )}
        {activeMainTab === "fridge" && !isLoading && !ingredientError && <FridgeWorkspace ingredients={ingredients} visibleIngredients={visibleIngredients} activeStorage={activeStorage} setActiveStorage={setActiveStorage} sortOrder={sortOrder} setSortOrder={setSortOrder} recommendedCount={recommendedCount} openIngredientForm={openIngredientForm} editIngredient={editIngredient} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} requestIngredientAction={requestIngredientAction} onIngredientSelect={handleIngredientSelect} showRecommendations={() => setActiveMainTab("recommend")} showShopping={() => setActiveMainTab("shopping")} />}
        {activeMainTab === "recommend" && <RecommendWorkspace ingredients={ingredients} recipes={mockRecipes} selectedMood={selectedMood} setSelectedMood={setSelectedMood} includeOneMissing={includeOneMissing} setIncludeOneMissing={setIncludeOneMissing} selectedMenuId={selectedMenuId} onSelectRecipe={handleRecipeSelect} />}
        {activeMainTab === "recipe" && <RecipeWorkspace menu={selectedMenu} ingredients={ingredients} isLoading={isRecipeLoading} onBack={() => setActiveMainTab("recommend")} />}
        {activeMainTab === "shopping" && <ShoppingWorkspace menu={selectedMenu} ingredients={ingredients} />}
      </main>
      {message.text && <div className={`toast-message ${message.type}`} role={message.type === "error" ? "alert" : "status"} aria-live="polite">{message.text}</div>}
      {isFormOpen && <IngredientFormModal title={editingIngredientId ? "재료 수정" : "재료 추가"} onClose={closeIngredientForm}>
        <IngredientForm formValues={formValues} errors={errors} isEditing={Boolean(editingIngredientId)} isSubmitting={isSubmitting} initialFocusField={initialFocusField} onChange={handleFormChange} onBlur={handleFormBlur} onTagToggle={handleTagToggle} onSubmit={handleSubmitIngredient} onCancel={closeIngredientForm} />
      </IngredientFormModal>}
      {confirmAction && <ConfirmDialog action={confirmAction} isSubmitting={isSubmitting} onCancel={() => setConfirmAction(null)} onConfirm={completeIngredientAction} />}
      {naggingMessage && selectedIngredient && <NaggingMessage message={naggingMessage} onAcceptSuggestion={acceptNaggingSuggestion} onContinueOriginal={() => continueWithRamen("ramen-basic")} onClose={closeNaggingMessage} />}
      {coachReaction && pendingRecipe && <CoachReactionModal reaction={coachReaction} recipeName={pendingRecipe.name} onContinue={continueFromCoach} onClose={() => { setCoachReaction(null); setPendingRecipe(null); }} />}
    </div>
  );
}

function FridgeWorkspace({ ingredients, visibleIngredients, activeStorage, setActiveStorage, sortOrder, setSortOrder, recommendedCount, openIngredientForm, editIngredient, openMenuId, setOpenMenuId, requestIngredientAction, onIngredientSelect, showRecommendations, showShopping }) {
  const urgentIngredients = ingredients
    .filter((item) => isUrgentIngredient(getDaysRemaining(getIngredientDueDate(item))))
    .sort((a, b) => getDaysRemaining(getIngredientDueDate(a)) - getDaysRemaining(getIngredientDueDate(b)));
  const nearestIngredient = urgentIngredients[0] ?? null;

  return <section className="fridge-screen">
    <div className="screen-title fridge-title">
      <div><h1>내 냉장고</h1><p>보유한 재료를 확인하고 오늘 만들 수 있는 메뉴를 찾아보세요.</p></div>
    </div>

    <ExpirationAlertBanner ingredient={nearestIngredient} ingredientCount={ingredients.length} menuCount={recommendedCount} onAction={showRecommendations} />
    <QuickActionSection onRecommend={showRecommendations} onUrgent={() => setActiveStorage("urgent")} onShopping={showShopping} />

    <section className="board-panel fridge-board">
      <div className="ingredient-heading"><div><p className="eyebrow">MY INGREDIENTS</p><h2>내 재료 <span>{ingredients.length}개</span></h2></div><button className="secondary-action" type="button" onClick={openIngredientForm}>+ 재료 추가</button></div>
      <div className="ingredient-toolbar">
        <nav className="storage-tabs" aria-label="재료 필터">{Object.entries(storageLabels).map(([id, label]) => <button key={id} type="button" className={activeStorage === id ? "active" : ""} aria-pressed={activeStorage === id} onClick={() => setActiveStorage(id)}>{label}</button>)}</nav>
        <label className="sort-control"><span>정렬</span><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="expiry">소비기한 임박순</option><option value="recent">최근 등록순</option><option value="name">이름순</option></select></label>
      </div>

      {ingredients.length === 0 ? <EmptyIngredientState onAdd={openIngredientForm} /> : visibleIngredients.length === 0 ? <div className="empty-board"><strong>조건에 맞는 재료가 없어요.</strong><span>다른 필터를 선택해 보세요.</span></div> : <div className="ingredient-grid">{visibleIngredients.map((ingredient) => <IngredientTile key={ingredient.id} ingredient={ingredient} isMenuOpen={openMenuId === ingredient.id} onToggleMenu={() => setOpenMenuId((current) => current === ingredient.id ? null : ingredient.id)} onCloseMenu={() => setOpenMenuId(null)} onEdit={editIngredient} onAction={requestIngredientAction} onFindRecipes={() => onIngredientSelect(ingredient)} />)}</div>}
    </section>
  </section>;
}

function ExpirationAlertBanner({ ingredient, ingredientCount, menuCount, onAction }) {
  if (!ingredient) return <section className="expiration-banner calm"><div className="banner-icon" aria-hidden="true">✓</div><div className="banner-copy"><p className="eyebrow">먼저 먹을 재료</p><h2>현재 소비기한이 임박한 재료가 없어요</h2><p>냉장고 재료로 만들 수 있는 메뉴를 확인해 보세요.</p><button type="button" onClick={onAction}>오늘 메뉴 추천받기 <span aria-hidden="true">→</span></button></div><BannerStats ingredientCount={ingredientCount} menuCount={menuCount} /></section>;

  const daysRemaining = getDaysRemaining(getIngredientDueDate(ingredient));
  return <section className="expiration-banner"><div className="banner-icon" aria-hidden="true">!</div><div className="banner-copy"><p className="eyebrow">먼저 먹을 재료</p><h2>{withObjectParticle(ingredient.name)} 먼저 사용해 주세요</h2><p>{getExpirationSentence(daysRemaining)}</p><button type="button" onClick={onAction}>{ingredient.name}로 만들 수 있는 메뉴 보기 <span aria-hidden="true">→</span></button></div><BannerStats ingredientCount={ingredientCount} menuCount={menuCount} /></section>;
}

function BannerStats({ ingredientCount, menuCount }) {
  return <div className="banner-stats"><div><span>전체 재료</span><strong>{ingredientCount}개</strong></div><div><span>지금 만들 수 있는 메뉴</span><strong>{menuCount}개</strong></div></div>;
}

function QuickActionSection({ onRecommend, onUrgent, onShopping }) {
  const actions = [
    ["🍳", "오늘 메뉴 추천", "보유 재료로 메뉴 찾기", onRecommend],
    ["⏰", "먼저 먹을 재료", "기한이 가까운 재료 보기", onUrgent],
    ["🛒", "장보기 목록", "부족한 재료 확인하기", onShopping],
  ];
  return <section className="quick-actions" aria-label="빠른 실행">{actions.map(([icon, title, description, action]) => <button key={title} type="button" onClick={action}><span className="quick-icon" aria-hidden="true">{icon}</span><span><strong>{title}</strong><small>{description}</small></span><b aria-hidden="true">→</b></button>)}</section>;
}

function SummaryCard({ tone, label, value, description }) {
  return <article className={`summary-card ${tone}`}><span>{label}</span><strong>{value}</strong><p>{description}</p></article>;
}

function IngredientTile({ ingredient, isMenuOpen, onToggleMenu, onCloseMenu, onEdit, onAction, onFindRecipes }) {
  const expiration = getIngredientExpirationPresentation(ingredient);
  const isUrgent = isUrgentIngredient(expiration.daysRemaining);
  const ingredientTags = getIngredientTags(ingredient);

  return <article className={`ingredient-tile ${expiration.status}`}>
    <div className="tile-top"><span className="ingredient-emoji" aria-hidden="true">{ingredient.icon}</span><div className="tile-primary"><div className="tile-title-row"><h3>{ingredient.name}</h3><strong className="quantity-text">{formatIngredientQuantity(ingredient)}</strong></div><div className={`expiration-line ${expiration.status}`}><span className="dday-badge">{expiration.badge}</span><strong>{expiration.label}</strong></div><span className="storage-info">{storageLabels[ingredient.storage]} 보관</span></div><IngredientMenu ingredient={ingredient} isOpen={isMenuOpen} onToggle={onToggleMenu} onClose={onCloseMenu} onEdit={onEdit} onAction={onAction} /></div>
    <div className="ingredient-labels" aria-label="재료 분류 및 특성"><span className="category-label">분류 · {getIngredientCategoryLabel(ingredient.category)}</span>{ingredientTags.map((tag) => <span className="attribute-label" key={tag}>{tag.startsWith("nutrition:") ? "영양" : "가공"} · {INGREDIENT_TAG_LABELS[tag]}</span>)}{ingredient.isInstant && ingredient.category !== "instant" && <span className="instant-label">인스턴트</span>}{ingredient.isPrepared && ingredient.category !== "prepared" && <span className="category-label">완제품</span>}{isUrgent && <span className="use-first-label">먼저 사용</span>}</div>
    <button className="find-recipe-button" type="button" onClick={onFindRecipes}>이 재료로 요리 찾기 <span aria-hidden="true">→</span></button>
  </article>;
}

function IngredientMenu({ ingredient, isOpen, onToggle, onClose, onEdit, onAction }) {
  return <div className="ingredient-menu" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onClose(); }}>
    <button className="more-button" type="button" aria-label={`${ingredient.name} 메뉴 열기`} aria-haspopup="menu" aria-expanded={isOpen} onClick={onToggle}>···</button>
    {isOpen && <div className="menu-popover" role="menu"><button type="button" role="menuitem" onClick={() => onEdit(ingredient, "quantity")}>수량 변경</button><button type="button" role="menuitem" onClick={() => onEdit(ingredient, "expiryDays")}>소비기한 수정</button><button type="button" role="menuitem" onClick={() => onAction("used", ingredient)}>모두 사용함</button><button className="danger" type="button" role="menuitem" onClick={() => onAction("delete", ingredient)}>삭제</button></div>}
  </div>;
}

function EmptyIngredientState({ onAdd }) {
  return <div className="empty-ingredient"><span aria-hidden="true">🥕</span><h3>아직 등록된 재료가 없어요</h3><p>냉장고에 있는 재료를 추가하면<br />소비기한과 추천 메뉴를 확인할 수 있어요.</p><button type="button" onClick={onAdd}>첫 재료 추가하기</button></div>;
}

function IngredientFormModal({ title, onClose, children }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [onClose]);

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="ingredient-modal-title"><div className="modal-heading"><div><p className="eyebrow">MY INGREDIENTS</p><h2 id="ingredient-modal-title">{title}</h2><p>냉장고에 보관할 재료 정보를 입력해 주세요.</p></div><button className="modal-close" type="button" aria-label="재료 입력창 닫기" onClick={onClose}>×</button></div>{children}</section></div>;
}

function ConfirmDialog({ action, isSubmitting, onCancel, onConfirm }) {
  const isDelete = action.type === "delete";
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onCancel]);

  return <div className="modal-backdrop confirm-backdrop" onMouseDown={(event) => { if (!isSubmitting && event.target === event.currentTarget) onCancel(); }}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description"><span className={isDelete ? "danger-icon" : "confirm-icon"} aria-hidden="true">{isDelete ? "!" : "✓"}</span><h2 id="confirm-title">{isDelete ? `${withObjectParticle(action.ingredient.name)} 냉장고에서 삭제할까요?` : `${withObjectParticle(action.ingredient.name)} 모두 사용한 것으로 처리할까요?`}</h2><p id="confirm-description">{isDelete ? "삭제한 재료는 복구할 수 없습니다." : "목록에서 재료가 사라져요."}</p><div className="confirm-actions"><button type="button" onClick={onCancel} disabled={isSubmitting}>취소</button><button className={isDelete ? "danger" : "primary"} type="button" autoFocus onClick={onConfirm} disabled={isSubmitting}>{isSubmitting ? "처리 중..." : isDelete ? "삭제하기" : "모두 사용함"}</button></div></section></div>;
}

function WorkspaceShell({ eyebrow, title, description, children }) {
  return <section className="content-screen"><div className="screen-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{children}</section>;
}

const moodOptions = [
  { id: "noFire", icon: "🛋️", title: "불도 켜기 싫어요", description: "전자레인지·무가열, 10분 안팎" },
  { id: "quick", icon: "🍳", title: "15분 정도는 괜찮아요", description: "간단한 팬·냄비 요리" },
  { id: "special", icon: "✨", title: "오늘은 제대로 만들래요", description: "조금 더 분위기 있는 한 끼" },
];

function RecommendWorkspace({ ingredients, recipes, selectedMood, setSelectedMood, includeOneMissing, setIncludeOneMissing, selectedMenuId, onSelectRecipe }) {
  const recommendations = getRecommendedRecipes({ recipes, ingredients, selectedMood, includeOneMissing });
  const regularRecommendations = recommendations.filter(({ recipe }) => !recipe.isSpecial).slice(0, 3);
  const oneMissingRecommendations = recommendations.filter(({ recipe, availability }) => !recipe.isSpecial && availability.status === "oneMissing").slice(0, 3);
  const specialRecommendations = getRecommendedRecipes({ recipes, ingredients, selectedMood: "special", includeOneMissing: true }).filter(({ availability }) => availability.missingIngredients.length <= 3).slice(0, 3);
  const primaryRecommendations = selectedMood === "special" ? specialRecommendations : regularRecommendations;

  return <WorkspaceShell eyebrow="Meal Coach" title="오늘 뭐 먹지?" description="지금 할 수 있는 만큼만 골라보세요. 냉장고 상황에 맞춰 선택지를 줄여드릴게요.">
    <section className="mood-section" aria-labelledby="mood-title">
      <div className="section-heading"><p className="eyebrow">Today&apos;s Energy</p><h2 id="mood-title">오늘은 어느 정도까지 할 수 있어요?</h2></div>
      <div className="mood-selector">{moodOptions.map((mood) => <button key={mood.id} type="button" className={selectedMood === mood.id ? "active" : ""} aria-pressed={selectedMood === mood.id} onClick={() => setSelectedMood(mood.id)}><span aria-hidden="true">{mood.icon}</span><strong>{mood.title}</strong><small>{mood.description}</small></button>)}</div>
    </section>

    <section className="recommendation-section" aria-labelledby="recommendation-title">
      <div className="recommendation-section-heading"><div><p className="eyebrow">For You</p><h2 id="recommendation-title">지금 고르기 좋은 메뉴</h2></div><label className="one-missing-toggle"><input type="checkbox" checked={includeOneMissing} onChange={(event) => setIncludeOneMissing(event.target.checked)} /> 재료 1개 부족한 메뉴도 보기</label></div>
      {primaryRecommendations.length ? <div className="recipe-recommendation-grid">{primaryRecommendations.map((recommendation) => <RecipeCard key={recommendation.recipe.id} {...recommendation} isSelected={selectedMenuId === recommendation.recipe.id} onSelect={() => onSelectRecipe(recommendation.recipe)} />)}</div> : <EmptyRecipeState onShowOneMissing={() => setIncludeOneMissing(true)} />}
      {selectedMood !== "special" && includeOneMissing && oneMissingRecommendations.length > 0 && <div className="one-missing-section"><h3>재료 하나만 더 있으면 가능한 메뉴</h3><div className="recipe-recommendation-grid compact">{oneMissingRecommendations.map((recommendation) => <RecipeCard key={recommendation.recipe.id} {...recommendation} isSelected={selectedMenuId === recommendation.recipe.id} onSelect={() => onSelectRecipe(recommendation.recipe)} />)}</div></div>}
    </section>

    {selectedMood !== "special" && <section className="special-recipe-section" aria-labelledby="special-title"><div className="recommendation-section-heading"><div><p className="eyebrow">A Little Special</p><h2 id="special-title">오늘 조금 분위기 내고 싶다면</h2><p>추가 재료는 최대 3개까지만 필요한 메뉴예요.</p></div><button type="button" onClick={() => setSelectedMood("special")}>스페셜 메뉴 모아보기 →</button></div><div className="recipe-recommendation-grid compact">{specialRecommendations.map((recommendation) => <RecipeCard key={recommendation.recipe.id} {...recommendation} isSelected={selectedMenuId === recommendation.recipe.id} onSelect={() => onSelectRecipe(recommendation.recipe)} />)}</div></section>}
  </WorkspaceShell>;
}

function RecipeCard({ recipe, availability, score, scoreReasons, scoreBreakdown, isSelected, onSelect }) {
  const availabilityCopy = availability.status === "available" ? "지금 재료로 만들 수 있어요." : availability.status === "oneMissing" ? `${availability.missingIngredients[0]} 1개만 더 있으면 만들 수 있어요.` : `${availability.missingIngredients.length}개 재료가 더 필요해요.`;
  return <article className={`recipe-card ${isSelected ? "selected" : ""} ${recipe.isSpecial ? "special" : ""}`}>
    <div className="recipe-card-top"><span className="recipe-type-chip">{recipe.isSpecial ? "스페셜" : recipe.recommendationType === "instant" ? "간편식" : "오늘 추천"}</span><span className="recommendation-score" title={`재료 ${scoreBreakdown.availability} · 기한 ${scoreBreakdown.expiry} · 시간 ${scoreBreakdown.time} · 영양 ${scoreBreakdown.nutrition}`}>{score}점</span></div>
    <span className={`availability-dot ${availability.status}`}>{availability.status === "available" ? "바로 가능" : availability.status === "oneMissing" ? "1개 부족" : "장보기 필요"}</span>
    <h3>{recipe.name}</h3>
    <p className="recipe-meta">{recipe.cookingTime}분 · {recipeDifficultyLabels[recipe.difficulty]} · {cookingMethodLabels[recipe.cookingMethod]}</p>
    <p className="availability-copy">{availabilityCopy}</p>
    {availability.missingIngredients.length > 0 && <div className="chip-list missing" aria-label="부족한 재료">{availability.missingIngredients.slice(0, 3).map((item) => <em key={item}>{item}</em>)}</div>}
    <div className="recommendation-reasons"><strong>점수 근거</strong><ul>{scoreReasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul></div>
    <button type="button" onClick={onSelect}>레시피 보기</button>
  </article>;
}

function EmptyRecipeState({ onShowOneMissing }) {
  return <div className="empty-recipe-state"><span aria-hidden="true">🍽️</span><h3>지금 조건에 맞는 메뉴가 없어요.</h3><p>다른 상태를 선택하거나 재료 1개만 추가하면 만들 수 있는 메뉴를 확인해 보세요.</p><button type="button" onClick={onShowOneMissing}>재료 1개 부족한 메뉴 보기</button></div>;
}

function RecipeWorkspace({ menu, ingredients, isLoading, onBack }) {
  if (isLoading) return <WorkspaceShell eyebrow="Recipe Detail" title="레시피 상세" description="선택한 메뉴 정보를 불러오고 있습니다."><div className="recipe-empty"><h2>레시피를 불러오는 중입니다...</h2><p>잠시만 기다려주세요.</p></div></WorkspaceShell>;
  if (!menu) return <WorkspaceShell eyebrow="Recipe Detail" title="레시피 상세" description="식단 추천에서 메뉴를 선택하면 조리 과정이 표시됩니다."><div className="recipe-empty"><h2>선택한 메뉴를 찾을 수 없습니다</h2><p>식단 추천 화면에서 메뉴를 선택해주세요.</p><button type="button" onClick={onBack}>추천 메뉴 보기</button></div></WorkspaceShell>;

  const isRecipeMock = Array.isArray(menu.requiredIngredients);
  const usedIngredients = isRecipeMock ? menu.requiredIngredients : Array.isArray(menu.used) ? menu.used : [];
  const optionalIngredients = isRecipeMock ? menu.optionalIngredients ?? [] : [];
  const availability = isRecipeMock ? getRecipeAvailability(menu, ingredients) : getIngredientGroups(menu, ingredients);
  const { ownedIngredients, missingIngredients } = availability;
  const nutrition = nutritionByMenuId[menu.id];
  const substitutes = substitutesByMenuId[menu.id] ?? [];
  const recipeSteps = Array.isArray(menu.steps) ? menu.steps : [];

  const detailDescription = isRecipeMock ? menu.recommendationReasons?.[0] ?? "오늘 상황에 맞춰 추천한 메뉴입니다." : menu.summary ?? "메뉴 설명을 준비 중입니다.";
  const cookingTime = isRecipeMock ? `${menu.cookingTime}분` : menu.time ?? "정보 없음";
  const difficulty = isRecipeMock ? recipeDifficultyLabels[menu.difficulty] : menu.level ?? "정보 없음";
  const methodDescription = isRecipeMock ? cookingMethodLabels[menu.cookingMethod] : "초보자 기준";

  return <WorkspaceShell eyebrow="Recipe Detail" title={menu.name ?? "메뉴 상세"} description={detailDescription}>
    <div className="recipe-summary"><SummaryCard tone="green" label="조리 시간" value={cookingTime} description="예상 소요 시간" /><SummaryCard tone="neutral" label="난이도" value={difficulty} description={methodDescription} /><SummaryCard tone="orange" label="필수 재료" value={`${usedIngredients.length}개`} description={usedIngredients.length ? usedIngredients.join(", ") : "등록된 재료 정보 없음"} /></div>
    <section className="recipe-section"><div className="section-heading"><p className="eyebrow">Ingredient Check</p><h2>필수·선택 재료</h2></div><div className="ingredient-status-grid"><IngredientStatus title="보유한 필수 재료" items={ownedIngredients} tone="owned" emptyMessage="현재 보유한 필수 재료가 없습니다." /><IngredientStatus title="부족한 필수 재료" items={missingIngredients} tone="missing" emptyMessage="추가로 필요한 필수 재료가 없습니다." /></div>{optionalIngredients.length > 0 && <div className="optional-ingredients"><strong>있으면 더 좋은 선택 재료</strong><div className="chip-list">{optionalIngredients.map((item) => <em key={item}>{item}</em>)}</div></div>}</section>
    {isRecipeMock && <section className="recipe-section"><div className="section-heading"><p className="eyebrow">Why This Menu</p><h2>이 메뉴를 추천한 이유</h2></div><ul className="detail-reasons">{menu.recommendationReasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul></section>}
    {!isRecipeMock && <section className="recipe-section"><div className="section-heading"><p className="eyebrow">Mock Nutrition</p><h2>영양 정보</h2></div>{nutrition ? <div className="nutrition-grid"><NutritionCard label="열량" value={nutrition.calories} /><NutritionCard label="단백질" value={nutrition.protein} /><NutritionCard label="탄수화물" value={nutrition.carbohydrates} /></div> : <div className="recipe-data-empty">이 메뉴의 mock 영양 정보는 아직 준비되지 않았습니다.</div>}</section>}
    <section className="recipe-section"><div className="section-heading"><p className="eyebrow">Cooking Steps</p><h2>조리 순서</h2></div>{recipeSteps.length ? <ol className="recipe-steps">{recipeSteps.map((step, index) => <li key={`${index}-${step}`}><span>{index + 1}</span><p>{step}</p></li>)}</ol> : <div className="recipe-data-empty">등록된 조리 순서가 없습니다.</div>}</section>
    <section className="recipe-section"><div className="section-heading"><p className="eyebrow">Substitutes</p><h2>대체 재료 안내</h2></div>{substitutes.length ? <div className="substitute-list">{substitutes.map(({ ingredient, alternatives }) => <article key={ingredient}><strong>{ingredient}</strong><span>대신 사용할 수 있어요</span><div className="chip-list">{alternatives.map((alternative) => <em key={alternative}>{alternative}</em>)}</div></article>)}</div> : <div className="recipe-data-empty">안내할 대체 재료 정보가 없습니다.</div>}</section>
  </WorkspaceShell>;
}

function IngredientStatus({ title, items, tone, emptyMessage }) {
  return <article className={`ingredient-status ${tone}`}><h3>{title}</h3>{items.length ? <div className="chip-list">{items.map((item) => <em key={item}>{item}</em>)}</div> : <p>{emptyMessage}</p>}</article>;
}

function NutritionCard({ label, value }) {
  return <article className="nutrition-card"><span>{label}</span><strong>{value}</strong><small>mock 데이터</small></article>;
}

function ShoppingWorkspace({ menu, ingredients }) {
  const missingIngredients = menu ? (Array.isArray(menu.requiredIngredients) ? getRecipeAvailability(menu, ingredients).missingIngredients : menu.missing ?? []) : [];
  return <WorkspaceShell eyebrow="Shopping Recommendation" title="구매 추천" description="선택한 메뉴에 필요한 부족 재료를 카드로 확인하세요.">
    {!menu ? <div className="empty-board">부족 재료가 있는 메뉴를 선택하면 구매 추천 카드가 표시됩니다.</div> : missingIngredients.length ? <div className="shopping-grid">{missingIngredients.map((item) => <article className="shopping-card" key={item}><span>부족 재료</span><h3>{item}</h3><p>{menu.name}에 넣으면 맛과 완성도가 올라가는 추천 구매 재료입니다.</p><small>사용될 메뉴</small><strong>{menu.name}</strong><button type="button">더미 구매 버튼</button></article>)}</div> : <div className="empty-board">이 메뉴는 현재 재료만으로 만들 수 있습니다.</div>}
  </WorkspaceShell>;
}

export default App;
