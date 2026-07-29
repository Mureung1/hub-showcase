import { useEffect, useMemo, useState } from "react";
import { getDefaultIngredientTags, getIngredientTags, INGREDIENT_TAG_LABELS } from "../../shared/ingredientTags";
import { convertQuantityToStandard } from "../../shared/quantityUnits";
import "./App.css";
import IngredientForm from "./components/IngredientForm";
import NaggingMessage from "./components/NaggingMessage";
import RecipeConsumptionModal from "./components/RecipeConsumptionModal";
import { getAllowedStorageOptions, getDefaultStorage, getSuggestedUseByDate } from "./data/shelfLifeRules";
import { consumeIngredients, deleteIngredient, getIngredients, registerIngredient, updateIngredient } from "./services/ingredients";
import { fetchRecommendations } from "./services/recommendations";
import {
  getDaysRemaining,
  getExpirationSentence,
  getIngredientDueDate,
  getTodayDateString,
  isUrgentIngredient,
} from "./utils/expiration";
import {
  buildIngredientFromForm,
  formatIngredientQuantity,
  getIngredientExpirationPresentation,
} from "./utils/ingredientUtils";
import { getRecipeNaggingMessage } from "./utils/naggingUtils";
import { getCoachingTone, readMealChoiceHistory } from "./utils/mealChoiceHistory";
import { isPantryIngredientName } from "./utils/pantry";
import {
  createShoppingSearchUrl,
  isRecipeSaved,
  readSavedRecipes,
  toggleSavedRecipe,
} from "./utils/savedRecipes";

const storageLabels = { urgent: "먼저 먹기", all: "전체", fridge: "냉장", freezer: "냉동", room: "실온" };
const mainTabs = [
  ["fridge", "내 냉장고"],
  ["recommend", "오늘의 메뉴"],
];
const recipeDifficultyLabels = { easy: "쉬움", normal: "보통" };
const cookingMethodLabels = { noFire: "불 없이", fire: "가열 조리" };

function withObjectParticle(name) {
  const lastCharacterCode = name.charCodeAt(name.length - 1);
  const isHangulSyllable = lastCharacterCode >= 0xac00 && lastCharacterCode <= 0xd7a3;
  const hasFinalConsonant = isHangulSyllable && (lastCharacterCode - 0xac00) % 28 !== 0;
  return `${name}${hasFinalConsonant ? "을" : "를"}`;
}

function createInitialFormValues(category = "egg", requestedStorage = null) {
  const allowedStorage = getAllowedStorageOptions(category);
  const storage = allowedStorage.some(({ id }) => id === requestedStorage) ? requestedStorage : getDefaultStorage(category);
  return { name: "", quantity: "", unit: "개", storage, category, expirationDate: getSuggestedUseByDate(category, storage), expirySource: "suggested", tags: getDefaultIngredientTags(category) };
}
function App() {
  const [ingredients, setIngredients] = useState([]);
  const [todayKey, setTodayKey] = useState(getTodayDateString);
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
  useEffect(() => {
    let midnightTimer;
    const scheduleNextMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      midnightTimer = window.setTimeout(() => {
        setTodayKey(getTodayDateString());
        scheduleNextMidnight();
      }, nextMidnight.getTime() - now.getTime());
    };
    scheduleNextMidnight();
    return () => window.clearTimeout(midnightTimer);
  }, []);
  const [activeMainTab, setActiveMainTab] = useState("fridge");
  const [activeStorage, setActiveStorage] = useState("all");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState(() => readSavedRecipes());
  const [selectedMood, setSelectedMood] = useState("expiryFirst");
  const [missingIngredientLimit, setMissingIngredientLimit] = useState(3);
  const [isRecipeLoading, setIsRecipeLoading] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [initialFocusField, setInitialFocusField] = useState("name");
  const [sortOrder, setSortOrder] = useState("expiry");
  const [confirmAction, setConfirmAction] = useState(null);
  const [pendingRecipe, setPendingRecipe] = useState(null);
  const [naggingMessage, setNaggingMessage] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "success" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState(createInitialFormValues);
  const [errors, setErrors] = useState({});
  const [recommendationRecipes, setRecommendationRecipes] = useState([]);
  const [recommendationMeta, setRecommendationMeta] = useState(null);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(false);
  const [isMoreRecommendationsLoading, setIsMoreRecommendationsLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");
  const [recommendationErrorScope, setRecommendationErrorScope] = useState("initial");
  const [recommendationRetryKey, setRecommendationRetryKey] = useState(0);
  const [consumptionRecipe, setConsumptionRecipe] = useState(null);
  const [isConsumptionSubmitting, setIsConsumptionSubmitting] = useState(false);
  const [consumptionError, setConsumptionError] = useState("");
  const [consumedRecipeId, setConsumedRecipeId] = useState(null);
  const managedIngredients = useMemo(() => ingredients.filter((ingredient) => !isPantryIngredientName(ingredient.name)), [ingredients]);

  useEffect(() => {
    if (activeMainTab !== "recommend" || isLoading || ingredientError) return undefined;

    const controller = new AbortController();
    setIsRecommendationsLoading(true);
    setRecommendationError("");
    setRecommendationErrorScope("initial");

    fetchRecommendations({
      mode: selectedMood,
      maxMissingIngredients: missingIngredientLimit,
      signal: controller.signal,
    }).then((result) => {
      setRecommendationRecipes(result.recipes);
      setRecommendationMeta(result.meta);
      setSelectedRecipe(null);
    }).catch((error) => {
      if (error.name !== "AbortError") {
        setRecommendationError(error.message ?? "레시피 추천을 불러오지 못했습니다.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setIsRecommendationsLoading(false);
    });

    return () => controller.abort();
  }, [activeMainTab, ingredientError, ingredients, isLoading, missingIngredientLimit, recommendationRetryKey, selectedMood]);

  const loadMoreRecommendations = async () => {
    if (isMoreRecommendationsLoading || recommendationRecipes.length >= (recommendationMeta?.maxRecipes ?? 15)) return;

    setIsMoreRecommendationsLoading(true);
    setRecommendationError("");
    setRecommendationErrorScope("more");
    try {
      const result = await fetchRecommendations({
        mode: selectedMood,
        maxMissingIngredients: missingIngredientLimit,
        batchNumber: (recommendationMeta?.batchNumber ?? 1) + 1,
        excludedRecipeFingerprints: recommendationRecipes.map((recipe) => recipe.fingerprint),
      });
      setRecommendationRecipes((current) => [...current, ...result.recipes.filter((recipe) => !current.some((item) => item.fingerprint === recipe.fingerprint))]);
      setRecommendationMeta(result.meta);
    } catch (error) {
      setRecommendationError(error.message ?? "다른 추천을 불러오지 못했습니다.");
    } finally {
      setIsMoreRecommendationsLoading(false);
    }
  };

  const visibleIngredients = (() => {
    const filtered = managedIngredients.filter((item) => {
      if (activeStorage === "all") return true;
      if (activeStorage === "urgent") return isUrgentIngredient(getDaysRemaining(getIngredientDueDate(item)));
      return item.storage === activeStorage;
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === "recent") return managedIngredients.indexOf(a) - managedIngredients.indexOf(b);
      if (sortOrder === "name") return a.name.localeCompare(b.name, "ko");
      const aDays = getDaysRemaining(getIngredientDueDate(a)) ?? Number.POSITIVE_INFINITY;
      const bDays = getDaysRemaining(getIngredientDueDate(b)) ?? Number.POSITIVE_INFINITY;
      return aDays - bDays;
    });
  })();
  const recommendedCount = recommendationRecipes.filter((recipe) => recipe.missingIngredients.length === 0).length;

  const flash = (text, type = "success") => {
    setMessage({ text, type });
    window.setTimeout(() => setMessage({ text: "", type: "success" }), 2200);
  };

  const resetForm = (storage = activeStorage) => {
    setFormValues(createInitialFormValues("egg", ["all", "urgent"].includes(storage) ? null : storage));
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

    setFormValues((current) => {
      if (name === "category") {
        const nextStorage = getAllowedStorageOptions(value).some(({ id }) => id === current.storage) ? current.storage : getDefaultStorage(value);
        return {
          ...current,
          category: value,
          storage: nextStorage,
          tags: getDefaultIngredientTags(value),
          ...(current.expirySource === "suggested" ? { expirationDate: getSuggestedUseByDate(value, nextStorage) } : {}),
        };
      }
      if (name === "storage") {
        return {
          ...current,
          storage: value,
          ...(current.expirySource === "suggested" ? { expirationDate: getSuggestedUseByDate(current.category, value) } : {}),
        };
      }
      if (name === "expirationDate") return { ...current, expirationDate: value, expirySource: "manual" };
      return { ...current, [name]: value };
    });
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const applySuggestedDate = () => {
    setFormValues((current) => ({ ...current, expirationDate: getSuggestedUseByDate(current.category, current.storage), expirySource: "suggested" }));
    setErrors((current) => ({ ...current, expirationDate: "" }));
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
      expirationDate: "권장 사용 날짜를 선택해 주세요.",
    };
    if (messages[name]) setErrors((current) => ({ ...current, [name]: messages[name] }));
  };

  const handleSubmitIngredient = async (event) => {
    event.preventDefault();
    const name = formValues.name.trim();
    const quantity = formValues.quantity.trim();
    const nextErrors = {};

    if (!name) nextErrors.name = "재료명을 입력해 주세요.";
    if (isPantryIngredientName(name)) nextErrors.name = "기본 양념은 레시피 상세의 보유 설정에서 관리해 주세요.";
    if (!quantity) nextErrors.quantity = "수량을 입력해 주세요.";
    else if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) nextErrors.quantity = "0보다 큰 수량을 입력해 주세요.";
    else if (formValues.unit === "개" && !Number.isInteger(Number(quantity))) nextErrors.quantity = "개수는 정수로 입력해 주세요.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formValues.expirationDate)) nextErrors.expirationDate = "권장 사용 날짜를 선택해 주세요.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const existingIngredient = managedIngredients.find((item) => item.id === editingIngredientId) ?? null;
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
    setFormValues({ name: ingredient.name, quantity: String(ingredient.quantity ?? 1), unit: ingredient.unit ?? "개", storage: ingredient.storage, category: ingredient.category, expirationDate: getIngredientDueDate(ingredient) ?? getSuggestedUseByDate(ingredient.category, ingredient.storage), expirySource: "manual", tags: getIngredientTags(ingredient) });
    setErrors({});
    setInitialFocusField(focusField);
    setIsFormOpen(true);
  };

  const requestIngredientAction = (type, ingredient) => {
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
    if (!menu) return;

    setSelectedRecipe(menu);
    setActiveMainTab("recommend");
    setIsRecipeLoading(true);
    window.setTimeout(() => setIsRecipeLoading(false), 350);
  };

  const closeNaggingMessage = () => {
    setNaggingMessage(null);
    setPendingRecipe(null);
  };

  const continueFromNagging = (mode) => {
    setNaggingMessage(null);
    setPendingRecipe(null);
    setSelectedMood(mode);
    setMissingIngredientLimit(1);
    setSelectedRecipe(null);
    setActiveMainTab("recommend");
  };

  const handleRecipeSelect = (recipe) => {
    const nextNaggingMessage = getRecipeNaggingMessage({
      recipe,
      ingredients: managedIngredients,
      tone: getCoachingTone(readMealChoiceHistory(), { includeCurrentChoice: true }),
    });
    if (nextNaggingMessage) {
      setPendingRecipe(recipe);
      setNaggingMessage(nextNaggingMessage);
      return;
    }
    selectMenu(recipe);
  };

  const continueOriginalFromNagging = () => {
    if (!pendingRecipe) {
      continueFromNagging("quick");
      return;
    }
    const recipe = pendingRecipe;
    setNaggingMessage(null);
    setPendingRecipe(null);
    selectMenu(recipe);
  };

  const showRecommendations = () => {
    setSelectedRecipe(null);
    setActiveMainTab("recommend");
  };

  const openConsumptionModal = () => {
    setConsumptionError("");
    setConsumptionRecipe(selectedRecipe);
  };

  const closeConsumptionModal = () => {
    if (isConsumptionSubmitting) return;
    setConsumptionRecipe(null);
    setConsumptionError("");
  };

  const confirmRecipeConsumption = async (items) => {
    setIsConsumptionSubmitting(true);
    setConsumptionError("");
    try {
      const result = await consumeIngredients(items);
      await refreshIngredients(true);
      setConsumedRecipeId(consumptionRecipe.id);
      setConsumptionRecipe(null);
      const summary = result.consumed.map((item) => `${item.name} ${item.amount}${item.unit}`).join(", ");
      flash(`${summary}을(를) 냉장고에서 차감했어요.`);
    } catch (error) {
      setConsumptionError(error.message ?? "재료 차감에 실패했습니다.");
    } finally {
      setIsConsumptionSubmitting(false);
    }
  };

  const toggleRecipeSaved = (recipe) => {
    const result = toggleSavedRecipe(recipe);
    setSavedRecipes(result.recipes);
    if (!result.persisted) {
      flash("레시피를 브라우저에 저장하지 못했습니다.", "error");
      return;
    }
    flash(result.saved ? "레시피를 저장했습니다." : "저장한 레시피에서 삭제했습니다.");
  };

  return (
    <div className="app-shell" data-current-date={todayKey}>
      <header className={`site-header ${activeMainTab === "fridge" ? "fridge-context" : ""}`}>
        <div className="brand-mark" aria-label="서비스 이름 있는대로">
          있는대로
        </div>
        <nav className="header-nav" aria-label="상단 메뉴">
          <button type="button">서비스 소개</button>
          {mainTabs.map(([id, label]) => <button key={id} type="button" className={activeMainTab === id ? "active" : ""} aria-current={activeMainTab === id ? "page" : undefined} onClick={() => (id === "recommend" ? showRecommendations() : setActiveMainTab(id))}>{label}</button>)}
        </nav>
        {!selectedRecipe && <button className="header-cta" type="button" onClick={activeMainTab === "fridge" ? showRecommendations : openIngredientForm}>
          {activeMainTab === "fridge" ? "레시피 추천" : "재료 등록하기"}
        </button>}
      </header>

      <main>
        {activeMainTab === "fridge" && isLoading && (
          <div className="empty-board">재료를 불러오는 중입니다...</div>
        )}
        {activeMainTab === "fridge" && !isLoading && ingredientError && (
          <div className="empty-board" role="alert">
            <strong>재료를 불러오지 못했습니다.</strong>
            <span>{ingredientError}</span>
            <button type="button" onClick={() => refreshIngredients(true).catch(() => {})}>다시 시도</button>
          </div>
        )}
        {activeMainTab === "fridge" && !isLoading && !ingredientError && <FridgeWorkspace ingredients={managedIngredients} visibleIngredients={visibleIngredients} activeStorage={activeStorage} setActiveStorage={setActiveStorage} sortOrder={sortOrder} setSortOrder={setSortOrder} recommendedCount={recommendedCount} openIngredientForm={openIngredientForm} editIngredient={editIngredient} requestIngredientAction={requestIngredientAction} showRecommendations={showRecommendations} />}
        {activeMainTab === "recommend" && (selectedRecipe
          ? <RecipeWorkspace menu={selectedRecipe} isLoading={isRecipeLoading} onBack={showRecommendations} isSaved={isRecipeSaved(selectedRecipe, savedRecipes)} onToggleSaved={() => toggleRecipeSaved(selectedRecipe)} onConsume={openConsumptionModal} isConsumed={consumedRecipeId === selectedRecipe.id} />
          : <RecommendWorkspace recipes={recommendationRecipes} savedRecipes={savedRecipes} meta={recommendationMeta} isLoading={isRecommendationsLoading} isLoadingMore={isMoreRecommendationsLoading} error={recommendationError} onRetry={recommendationErrorScope === "more" ? loadMoreRecommendations : () => setRecommendationRetryKey((current) => current + 1)} onLoadMore={loadMoreRecommendations} selectedMood={selectedMood} setSelectedMood={setSelectedMood} missingIngredientLimit={missingIngredientLimit} setMissingIngredientLimit={setMissingIngredientLimit} onSelectRecipe={handleRecipeSelect} onToggleSaved={toggleRecipeSaved} />)}
      </main>
      {message.text && <div className={`toast-message ${message.type}`} role={message.type === "error" ? "alert" : "status"} aria-live="polite">{message.text}</div>}
      {isFormOpen && <IngredientFormModal title={editingIngredientId ? "재료 수정" : "재료 추가"} onClose={closeIngredientForm}>
        <IngredientForm formValues={formValues} errors={errors} isEditing={Boolean(editingIngredientId)} isSubmitting={isSubmitting} initialFocusField={initialFocusField} onChange={handleFormChange} onBlur={handleFormBlur} onTagToggle={handleTagToggle} onApplySuggestedDate={applySuggestedDate} onSubmit={handleSubmitIngredient} onCancel={closeIngredientForm} />
      </IngredientFormModal>}
      {confirmAction && <ConfirmDialog action={confirmAction} isSubmitting={isSubmitting} onCancel={() => setConfirmAction(null)} onConfirm={completeIngredientAction} />}
      {naggingMessage && pendingRecipe && <NaggingMessage message={naggingMessage} onAcceptSuggestion={() => continueFromNagging("balanced")} onContinueOriginal={continueOriginalFromNagging} onClose={closeNaggingMessage} />}
      {consumptionRecipe && <RecipeConsumptionModal recipe={consumptionRecipe} ingredients={managedIngredients} isSubmitting={isConsumptionSubmitting} error={consumptionError} onClose={closeConsumptionModal} onConfirm={confirmRecipeConsumption} />}
    </div>
  );
}

function FridgeWorkspace({ ingredients, visibleIngredients, activeStorage, setActiveStorage, sortOrder, setSortOrder, recommendedCount, openIngredientForm, editIngredient, requestIngredientAction, showRecommendations }) {
  const urgentIngredients = ingredients
    .filter((item) => isUrgentIngredient(getDaysRemaining(getIngredientDueDate(item))))
    .sort((a, b) => getDaysRemaining(getIngredientDueDate(a)) - getDaysRemaining(getIngredientDueDate(b)));
  const nearestIngredient = urgentIngredients[0] ?? null;

  return <section className="fridge-screen">
    <div className="screen-title fridge-title">
      <div><h1>내 냉장고</h1><p>보유한 재료를 확인하고 오늘 만들 수 있는 메뉴를 찾아보세요.</p></div>
    </div>

    <ExpirationAlertBanner ingredient={nearestIngredient} ingredientCount={ingredients.length} menuCount={recommendedCount} onAction={showRecommendations} />
    <QuickActionSection onRecommend={showRecommendations} onUrgent={() => setActiveStorage("urgent")} />

    <section className="board-panel fridge-board">
      <div className="ingredient-heading"><div><p className="eyebrow">MY INGREDIENTS</p><h2>내 재료 <span>{ingredients.length}개</span></h2></div><button className="secondary-action" type="button" onClick={openIngredientForm}>+ 재료 추가</button></div>
      <div className="ingredient-toolbar">
        <nav className="storage-tabs" aria-label="재료 필터">{Object.entries(storageLabels).map(([id, label]) => <button key={id} type="button" className={activeStorage === id ? "active" : ""} aria-pressed={activeStorage === id} onClick={() => setActiveStorage(id)}>{label}</button>)}</nav>
        <label className="sort-control"><span>정렬</span><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="expiry">소비기한 임박순</option><option value="recent">최근 등록순</option><option value="name">이름순</option></select></label>
      </div>

      {ingredients.length === 0 ? <EmptyIngredientState onAdd={openIngredientForm} /> : visibleIngredients.length === 0 ? <div className="empty-board"><strong>조건에 맞는 재료가 없어요.</strong><span>다른 필터를 선택해 보세요.</span></div> : <div className="ingredient-grid">{visibleIngredients.map((ingredient) => <IngredientTile key={ingredient.id} ingredient={ingredient} onEdit={editIngredient} onAction={requestIngredientAction} />)}</div>}
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

function QuickActionSection({ onRecommend, onUrgent }) {
  const actions = [
    ["🍳", "오늘 메뉴 추천", "보유 재료로 메뉴 찾기", onRecommend],
    ["⏰", "먼저 먹을 재료", "기한이 가까운 재료 보기", onUrgent],
  ];
  return <section className="quick-actions" aria-label="빠른 실행">{actions.map(([icon, title, description, action]) => <button key={title} type="button" onClick={action}><span className="quick-icon" aria-hidden="true">{icon}</span><span><strong>{title}</strong><small>{description}</small></span><b aria-hidden="true">→</b></button>)}</section>;
}

function IngredientTile({ ingredient, onEdit, onAction }) {
  const expiration = getIngredientExpirationPresentation(ingredient);
  const ingredientTags = getIngredientTags(ingredient);

  return <article className={`ingredient-tile ${expiration.status}`}>
    <div className="tile-top"><span className="ingredient-emoji" aria-hidden="true">{ingredient.icon}</span><div className="tile-primary"><div className="tile-title-row"><h3>{ingredient.name}</h3><strong className="quantity-text">{formatIngredientQuantity(ingredient)}</strong></div><div className={`expiration-line ${expiration.status}`}><span className="dday-badge">{expiration.badge}</span><strong>{expiration.label}</strong></div><span className="storage-info">{storageLabels[ingredient.storage]} 보관</span></div></div>
    {ingredientTags.length > 0 && <div className="ingredient-labels" aria-label="재료 태그">{ingredientTags.map((tag) => <span className="tag-label" key={tag}>{INGREDIENT_TAG_LABELS[tag]}</span>)}</div>}
    <div className="ingredient-tile-actions">
      <button type="button" onClick={() => onEdit(ingredient)}>재료 수정</button>
      <button className="used-action" type="button" onClick={() => onAction("used", ingredient)}>모두 사용</button>
    </div>
  </article>;
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
  { id: "expiryFirst", icon: "⏰", title: "소비기한부터 챙길래요", description: "임박 재료를 자연스러운 메뉴로 우선 활용" },
  { id: "quick", icon: "🍳", title: "무난하게 먹고 싶어요", description: "불 사용 여부와 관계없이 익숙한 한 끼" },
  { id: "balanced", icon: "🥗", title: "균형 있게 먹고 싶어요", description: "여러 식품군을 활용한 한 끼" },
];

function RecommendWorkspace({ recipes, savedRecipes, meta, isLoading, isLoadingMore, error, onRetry, onLoadMore, selectedMood, setSelectedMood, missingIngredientLimit, setMissingIngredientLimit, onSelectRecipe, onToggleSaved }) {
  const maxRecipes = meta?.maxRecipes ?? 15;
  const remainingRecommendationCount = Math.max(0, (meta?.maxBatches ?? 5) - (meta?.batchNumber ?? 1));
  const canLoadMore = recipes.length > 0
    && recipes.length < maxRecipes
    && remainingRecommendationCount > 0;

  return <WorkspaceShell eyebrow="Today&apos;s Menu" title="오늘 뭐 먹지?" description="지금 할 수 있는 만큼만 골라보세요. 냉장고 상황에 맞춰 선택지를 줄여드릴게요.">
    <section className="mood-section" aria-labelledby="mood-title">
      <div className="section-heading"><p className="eyebrow">Today&apos;s Energy</p><h2 id="mood-title">오늘은 어느 정도까지 할 수 있어요?</h2></div>
      <div className="mood-selector">{moodOptions.map((mood) => <button key={mood.id} type="button" className={selectedMood === mood.id ? "active" : ""} aria-pressed={selectedMood === mood.id} onClick={() => setSelectedMood(mood.id)}><span aria-hidden="true">{mood.icon}</span><strong>{mood.title}</strong><small>{mood.description}</small></button>)}</div>
    </section>

    {savedRecipes.length > 0 && <section className="recommendation-section saved-recipes-section" aria-labelledby="saved-recipes-title">
      <div className="recommendation-section-heading"><div><p className="eyebrow">Saved recipes</p><h2 id="saved-recipes-title">저장한 레시피</h2></div><span className="saved-recipe-count">{savedRecipes.length}개</span></div>
      <div className="recipe-recommendation-grid">{savedRecipes.map((recipe) => <RecipeCard key={recipe.fingerprint} recipe={recipe} label="저장한 메뉴" isSaved onSelect={() => onSelectRecipe(recipe)} onToggleSaved={() => onToggleSaved(recipe)} />)}</div>
    </section>}

    <section className="recommendation-section" aria-labelledby="recommendation-title">
      <div className="recommendation-section-heading"><div><p className="eyebrow">For You</p><h2 id="recommendation-title">지금 고르기 좋은 메뉴</h2></div><label className="one-missing-toggle">부족 재료 허용<select value={missingIngredientLimit} onChange={(event) => setMissingIngredientLimit(Number(event.target.value))}><option value={0}>없음</option><option value={1}>최대 1개</option><option value={2}>최대 2개</option><option value={3}>최대 3개</option><option value={4}>최대 4개</option><option value={5}>최대 5개</option></select></label></div>
      {isLoading && <div className="recommendation-status" role="status">보유 재료로 레시피를 추천하고 있어요...</div>}
      {!isLoading && error && <RecommendationError message={error} hasRecipes={recipes.length > 0} onRetry={onRetry} />}
      {!isLoading && recipes.length > 0 && <div className="recipe-recommendation-grid">{recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} label="오늘 추천" isSaved={isRecipeSaved(recipe, savedRecipes)} onSelect={() => onSelectRecipe(recipe)} onToggleSaved={() => onToggleSaved(recipe)} />)}</div>}
      {!isLoading && !error && recipes.length === 0 && <EmptyRecipeState onShowOneMissing={() => setMissingIngredientLimit(1)} />}
      {!isLoading && canLoadMore && <div className="recommendation-footer"><button type="button" onClick={onLoadMore} disabled={isLoadingMore}>{isLoadingMore ? "다른 추천을 찾고 있어요..." : `다른 추천 보기 (남은 ${remainingRecommendationCount}회)`}</button></div>}
    </section>
  </WorkspaceShell>;
}

function RecipeCard({ recipe, label, isSaved, onSelect, onToggleSaved }) {
  return <article className="recipe-card">
    <div className="recipe-card-top"><span className="recipe-type-chip">{label}</span><button className="save-recipe-button" type="button" aria-pressed={isSaved} onClick={onToggleSaved}>{isSaved ? "저장됨" : "저장"}</button></div>
    <h3>{recipe.name}</h3>
    <p className="recipe-meta">{recipe.cookingTime}분 · {recipeDifficultyLabels[recipe.difficulty]} · {cookingMethodLabels[recipe.cookingMethod]}</p>
    <div className="recipe-missing"><strong>부족한 재료</strong>{recipe.missingIngredients.length > 0 ? <div className="chip-list missing">{recipe.missingIngredients.map((item) => <a key={item} href={createShoppingSearchUrl(item)} target="_blank" rel="noreferrer" aria-label={`${item} 구매하기`}><em>{item} <span aria-hidden="true">↗</span></em></a>)}</div> : <p>없음</p>}</div>
    <button type="button" onClick={onSelect}>레시피 보기</button>
  </article>;
}

function RecommendationError({ message, hasRecipes, onRetry }) {
  return <div className="recommendation-error" role="alert"><strong>추천을 불러오지 못했습니다.</strong><p>{message}</p><button type="button" onClick={onRetry}>다시 시도</button>{hasRecipes && <small>마지막으로 불러온 추천은 아래에 유지했어요.</small>}</div>;
}

function EmptyRecipeState({ onShowOneMissing }) {
  return <div className="empty-recipe-state"><span aria-hidden="true">🍽️</span><h3>지금 조건에 맞는 메뉴가 없어요.</h3><p>다른 상태를 선택하거나 재료 1개만 추가하면 만들 수 있는 메뉴를 확인해 보세요.</p><button type="button" onClick={onShowOneMissing}>재료 1개 부족한 메뉴 보기</button></div>;
}

function RecipeWorkspace({ menu, isLoading, onBack, isSaved, onToggleSaved, onConsume, isConsumed }) {
  if (isLoading) return <WorkspaceShell eyebrow="Today&apos;s Menu" title="레시피 상세" description="선택한 메뉴 정보를 불러오고 있습니다."><div className="recipe-empty"><h2>레시피를 불러오는 중입니다...</h2><p>잠시만 기다려주세요.</p></div></WorkspaceShell>;
  if (!menu) return <WorkspaceShell eyebrow="Today&apos;s Menu" title="레시피 상세" description="오늘의 메뉴에서 선택하면 조리 과정을 볼 수 있습니다."><div className="recipe-empty"><h2>선택한 메뉴를 찾을 수 없습니다</h2><p>오늘의 메뉴 화면에서 레시피를 선택해주세요.</p><button type="button" onClick={onBack}>오늘의 메뉴 보기</button></div></WorkspaceShell>;

  const generatedMissingNames = new Set(menu.missingIngredients ?? []);
  const recipeSteps = Array.isArray(menu.steps) ? menu.steps : [];
  const standardizeIngredient = (ingredient, status) => {
    const standardQuantity = convertQuantityToStandard(ingredient.amount, ingredient.unit);
    return {
      ...ingredient,
      amount: standardQuantity?.quantity ?? ingredient.amount,
      unit: standardQuantity?.unit ?? ingredient.unit,
      status,
    };
  };
  const requiredIngredients = menu.requiredIngredients.map((ingredient) => standardizeIngredient(
    ingredient,
    generatedMissingNames.has(ingredient.name) ? "missing" : "owned",
  ));
  const optionalIngredients = (menu.optionalIngredients ?? []).map((ingredient) => standardizeIngredient(
    ingredient,
    "optional",
  ));
  const reasons = menu.recommendationReasons ?? [];
  const substitutions = menu.substitutions ?? [];
  const safetyNotes = menu.safetyNotes ?? [];
  const description = menu.description ?? menu.nutritionSummary;

  return <section className="recipe-detail-screen">
    <div className="recipe-detail-actions" role="toolbar" aria-label="레시피 작업">
      <button className="back-to-recipes" type="button" onClick={onBack}>← 오늘의 메뉴</button>
      <button className="save-detail-recipe" type="button" aria-pressed={isSaved} onClick={onToggleSaved}>{isSaved ? "♥ 저장됨" : "♡ 레시피 저장"}</button>
      <button className="consume-recipe-button" type="button" onClick={onConsume} disabled={isConsumed}>{isConsumed ? "✓ 재료 차감 완료" : "✓ 이 레시피로 요리했어요"}</button>
    </div>
    <header className="recipe-detail-hero">
      <p className="eyebrow">TODAY&apos;S RECIPE</p>
      <h1>{menu.name ?? "메뉴 상세"}</h1>
      <div className="recipe-hero-chips"><span>{cookingMethodLabels[menu.cookingMethod]}</span><span>{menu.cookingTime}분</span><span>{recipeDifficultyLabels[menu.difficulty]}</span><span>{menu.servings}인분</span>{generatedMissingNames.size > 0 && <span className="missing">부족 재료 {generatedMissingNames.size}개</span>}</div>
    </header>

    <div className="recipe-detail-body">
      <RecipeDetailSection eyebrow="Why this recipe" title="레시피 소개">
        <p className="recipe-introduction">{description}</p>
        {reasons.length > 0 && <ul className="recommendation-reasons">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      </RecipeDetailSection>

      <RecipeDetailSection eyebrow="Ingredient alternatives" title="대체 재료 안내" tone="substitution">
        {substitutions.length ? <div className="substitute-list">{substitutions.map((substitution) => <article className="substitution-tile" key={substitution.ingredient}><div className="substitution-tile-heading"><span>대체 대상</span><strong>{substitution.ingredient}</strong></div><p>{substitution.note}</p><div className="substitution-options"><span>대체 가능</span><div className="chip-list">{substitution.alternatives.map((alternative) => <em key={alternative}>{alternative}</em>)}</div></div></article>)}</div> : <p className="section-empty-copy">이 레시피는 대체 재료 안내가 필요하지 않아요.</p>}
      </RecipeDetailSection>

      <RecipeDetailSection eyebrow="Ingredients" title="재료">
        <div className="recipe-ingredient-list">{[...requiredIngredients, ...optionalIngredients].map((ingredient) => <RecipeIngredientRow key={`${ingredient.status}-${ingredient.name}`} ingredient={ingredient} />)}</div>
      </RecipeDetailSection>

      <RecipeDetailSection eyebrow="Cooking steps" title="조리 순서">
        {recipeSteps.length ? <ol className="recipe-steps">{recipeSteps.map((step, index) => <li key={`${index}-${step}`}><span>{index + 1}</span><p>{step}</p></li>)}</ol> : <p className="section-empty-copy">등록된 조리 순서가 없습니다.</p>}
      </RecipeDetailSection>

      <RecipeDetailSection eyebrow="Nutrition balance" title="영양 구성" tone="nutrition">
        <div className="nutrition-summary-card"><div className="chip-list">{menu.nutritionTags.map((tag) => <em key={tag}>{INGREDIENT_TAG_LABELS[tag] ?? tag}</em>)}</div><p>{menu.nutritionSummary}</p><small>영양 수치를 추정하지 않은 정성적인 안내예요.</small></div>
      </RecipeDetailSection>

      {safetyNotes.length > 0 && <RecipeDetailSection eyebrow="Safety notes" title="조리 시 주의사항" tone="safety"><ul className="recommendation-reasons">{safetyNotes.map((note) => <li key={note}>{note}</li>)}</ul></RecipeDetailSection>}
    </div>
  </section>;
}

function RecipeDetailSection({ eyebrow, title, tone = "", children }) {
  return <section className={`recipe-detail-section ${tone}`}><div className="recipe-section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{children}</section>;
}

function RecipeIngredientRow({ ingredient }) {
  const statusLabels = { owned: "보유", missing: "부족", optional: "선택" };
  return <div className={`recipe-ingredient-row ${ingredient.status}`}><div><strong>{ingredient.name}</strong><span className="ingredient-state-badge">{statusLabels[ingredient.status]}</span></div><div className="ingredient-row-actions"><span>{ingredient.amount}{ingredient.unit}</span>{ingredient.status === "missing" && <a href={createShoppingSearchUrl(ingredient.name)} target="_blank" rel="noreferrer">구매하기 <span aria-hidden="true">↗</span></a>}</div></div>;
}

export default App;
