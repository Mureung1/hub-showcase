import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { tipDefs } from '../data/tips';
import { buildDeductionState, buildSteps } from '../logic/fridgeLogic';

/* eslint-disable react-refresh/only-export-components */

// 화면 흐름 전체(냉장고 상태 + 현재 화면 스택 + 조리/식단/영수증 플로우의 임시 상태)를
// 하나의 컨텍스트로 관리한다. index.html 프로토타입의 전역 var들을 그대로 옮긴 것에 가깝다 —
// 화면이 17개라 컨텍스트를 기능별로 잘게 쪼갤 수도 있지만, 조리 흐름(레시피 상세→조리모드→
// 요리완료)처럼 여러 화면이 같은 임시 상태를 공유하는 경우가 많아 단일 컨텍스트가 더 단순하다.
const AppContext = createContext(null);

const TAB_HOME = { tab: 'tab-home', screen: 'home' };
const TAB_ROOTS = {
  home: 'tab-home', fridge: 'tab-fridge', 'recipe-list': 'tab-recipe',
  'shopping-sets': 'tab-shop', 'etc-menu': 'tab-etc',
};

function getInitialMultiplier() {
  const saved = localStorage.getItem('servingMultiplier');
  return saved ? parseFloat(saved) : 1.0;
}

export function AppProvider({ children }) {
  // ── 네비게이션 스택 (go/back/tab) ──
  const [screen, setScreen] = useState(TAB_HOME.screen);
  const [stack, setStack] = useState([]);

  const go = useCallback((id) => {
    setStack((s) => [...s, screen]);
    setScreen(id);
  }, [screen]);
  const back = useCallback(() => {
    setStack((s) => {
      const next = s.slice(0, -1);
      setScreen(s.length ? s[s.length - 1] : 'home');
      return next;
    });
  }, []);
  const tab = useCallback((id) => {
    setStack([]);
    setScreen(id);
  }, []);
  const activeTab = TAB_ROOTS[screen] || TAB_ROOTS[stack[0]] || 'tab-home';

  // ── 인분 설정 ──
  const [servingMultiplier, setServingMultiplierState] = useState(getInitialMultiplier());
  const setServingMultiplier = useCallback((val) => {
    setServingMultiplierState(val);
    localStorage.setItem('servingMultiplier', val.toString());
  }, []);

  // ── 냉장고 상태 ──
  const [fridge, setFridge] = useState({});
  const refreshFridge = useCallback(async () => {
    setFridge(await api.getFridge());
  }, []);
  useEffect(() => { refreshFridge(); }, [refreshFridge]);

  const addFridgeItem = useCallback(async (payload) => {
    await api.addFridgeItem(payload);
    await refreshFridge();
  }, [refreshFridge]);
  const updateFridgeItem = useCallback(async (id, patch) => {
    await api.updateFridgeItem(id, patch);
    await refreshFridge();
  }, [refreshFridge]);
  const deleteFridgeItem = useCallback(async (id) => {
    await api.deleteFridgeItem(id);
    await refreshFridge();
  }, [refreshFridge]);

  // ── 재료 상세 바텀시트 ──
  const [sheetItemId, setSheetItemId] = useState(null);
  const openSheet = useCallback((id) => setSheetItemId(id), []);
  // id를 넘기면 "그 id의 시트가 지금도 열려 있을 때만" 닫는다 — 비동기 작업(삭제 등) 도중
  // 사용자가 다른 아이템의 시트를 열었다면 그걸 대신 닫아버리지 않도록 함수형 업데이트로 최신 상태와 비교.
  const closeSheet = useCallback((id) => {
    setSheetItemId((current) => (id === undefined || current === id ? null : current));
  }, []);

  // ── 왕초보 팁 바텀시트 ──
  const [tipKey, setTipKey] = useState(null);
  const openTip = useCallback((key) => setTipKey(key), []);
  const closeTip = useCallback(() => setTipKey(null), []);
  const tip = tipKey ? tipDefs[tipKey] : null;

  // ── 영수증 촬영 → 인식 → 확정 ──
  const [receipt, setReceipt] = useState(null);
  const [expiryOverrides, setExpiryOverrides] = useState({});
  const shootReceipt = useCallback(async () => {
    try {
      const r = await api.uploadReceipt();
      setReceipt(r);
      setExpiryOverrides({});
      go('receipt-result');
    } catch (err) {
      alert(err.message);
    }
  }, [go]);
  const setExpiryOverride = useCallback((id, expiry) => {
    setExpiryOverrides((prev) => ({ ...prev, [id]: expiry }));
  }, []);
  const confirmReceipt = useCallback(async () => {
    try {
      await api.confirmReceipt(receipt.id, { expiryOverrides });
      await refreshFridge();
      tab('fridge');
    } catch (err) {
      alert(err.message);
    }
  }, [receipt, expiryOverrides, refreshFridge, tab]);

  // ── 레시피 상세 / 조리모드 / 요리완료 ──
  const [currentRecipeId, setCurrentRecipeId] = useState(null);
  const [recipeDetail, setRecipeDetail] = useState(null);
  const [checkedAddonIds, setCheckedAddonIds] = useState([]);
  const [cookIdx, setCookIdx] = useState(0);
  const [deductionState, setDeductionState] = useState([]);
  const [editingDeduction, setEditingDeduction] = useState(false);

  const openRecipeDetail = useCallback(async (id) => {
    try {
      setCurrentRecipeId(id);
      setCheckedAddonIds([]);
      setRecipeDetail(await api.getRecipeDetail(id, servingMultiplier));
      go('recipe-detail');
    } catch (err) {
      alert(err.message);
    }
  }, [go, servingMultiplier]);
  const toggleAddon = useCallback((id) => {
    setCheckedAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);
  const cookSteps = useMemo(
    () => (recipeDetail ? buildSteps(recipeDetail, checkedAddonIds) : []),
    [recipeDetail, checkedAddonIds],
  );
  const startCooking = useCallback(() => {
    setCookIdx(0);
    go('cooking');
  }, [go]);
  const openCookDoneRef = useRef(() => {});
  const cookStep = useCallback((dir) => {
    setCookIdx((idx) => {
      if (idx === cookSteps.length - 1 && dir === 1) {
        openCookDoneRef.current();
        return 0;
      }
      return Math.max(0, Math.min(cookSteps.length - 1, idx + dir));
    });
  }, [cookSteps.length]);

  const openCookDone = useCallback(() => {
    setDeductionState(buildDeductionState(fridge, recipeDetail, checkedAddonIds));
    setEditingDeduction(false);
    go('cook-done');
  }, [fridge, recipeDetail, checkedAddonIds, go]);
  // cookStep(1)이 마지막 스텝에서 openCookDone을 부를 때 최신 함수를 참조하도록 ref로 우회
  useEffect(() => { openCookDoneRef.current = openCookDone; }, [openCookDone]);

  const adjustDeduction = useCallback((i, delta) => {
    setDeductionState((prev) => prev.map((d, idx) => {
      if (idx !== i || d.fixed) return d;
      return { ...d, use: Math.max(0, Math.min(d.max, d.use + delta)) };
    }));
  }, []);

  const finishCooking = useCallback(async () => {
    try {
      const toApply = deductionState.filter((d) => d.use > 0);
      if (toApply.length) await api.cookDone(currentRecipeId, { deductions: toApply });
      await refreshFridge();
      setCheckedAddonIds([]);
      setEditingDeduction(false);
      tab('fridge');
    } catch (err) {
      alert(err.message);
    }
  }, [deductionState, currentRecipeId, refreshFridge, tab]);

  // ── 일주일 식단 루틴 ──
  const [pickedDishes, setPickedDishes] = useState([]);
  const [weekPlan, setWeekPlan] = useState(null);
  const [weekPlanDifficulty, setWeekPlanDifficulty] = useState('all');
  const [weekPlanType, setWeekPlanType] = useState('meal'); // 'meal' or 'side'
  const [mealShoppingList, setMealShoppingList] = useState(null);
  
  const togglePick = useCallback((id) => {
    setPickedDishes((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const maxPicks = weekPlanType === 'side' ? 1 : 2;
      if (prev.length >= maxPicks) return prev; // 더 이상 못 고르게 함
      return [...prev, id];
    });
  }, [weekPlanType]);
  
  const buildMealPlan = useCallback(async () => {
    try {
      setWeekPlan(await api.buildWeeklyPlan(pickedDishes, weekPlanDifficulty, weekPlanType));
      go('meal-plan');
    } catch (err) {
      alert(err.message);
    }
  }, [pickedDishes, weekPlanDifficulty, weekPlanType, go]);
  const openMealShoppingList = useCallback(async () => {
    if (!weekPlan || !weekPlan.days || weekPlan.days.length === 0) return;
    const ids = weekPlan.days.map((d) => d.recipe?.id).filter(Boolean);
    if (ids.length === 0) return;
    try {
      setMealShoppingList(await api.getMealShoppingList(ids, servingMultiplier));
      go('meal-shopping-list');
    } catch (err) {
      alert(err.message);
    }
  }, [weekPlan, go, servingMultiplier]);

  const clearMealPlan = useCallback(() => {
    setWeekPlan(null);
    setPickedDishes([]);
  }, []);

  // ── 추천 재료 세트 → 장보기 리스트 ──
  const [selectedSetId, setSelectedSetId] = useState(null);
  const [shareMealCount, setShareMealCount] = useState(3);
  const openShoppingList = useCallback((setId) => {
    setSelectedSetId(setId);
    go('shopping-list');
  }, [go]);

  const value = {
    screen, go, back, tab, activeTab,
    fridge, refreshFridge, addFridgeItem, updateFridgeItem, deleteFridgeItem,
    sheetItemId, openSheet, closeSheet,
    tip, tipKey, openTip, closeTip,
    receipt, shootReceipt, expiryOverrides, setExpiryOverride, confirmReceipt,
    currentRecipeId, recipeDetail, openRecipeDetail,
    checkedAddonIds, toggleAddon, cookSteps,
    cookIdx, startCooking, cookStep,
    deductionState, editingDeduction, setEditingDeduction, adjustDeduction, openCookDone, finishCooking,
    pickedDishes, setPickedDishes, weekPlan, setWeekPlan,
    weekPlanDifficulty, setWeekPlanDifficulty,
    weekPlanType, setWeekPlanType,
    mealShoppingList, togglePick, buildMealPlan, openMealShoppingList, clearMealPlan,
    shareMealCount, setShareMealCount,
    selectedSetId, openShoppingList,
    servingMultiplier, setServingMultiplier,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
