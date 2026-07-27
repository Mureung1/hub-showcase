// 실제 Supabase 없이 fridge_items 테이블 CRUD를 흉내내는 인메모리 fake.
// store.js가 실제로 쓰는 체이닝(select/insert/update().eq()/delete().eq())만 구현한다.
// recipes 테이블은 항상 count:0을 돌려줘서 store.getRecipesFromDB()가 번들 레시피
// (data/recipes.js)로 폴백하게 만든다 — 실제 프로덕션에서 Supabase 미설정 시와 동일한 경로.

let fridgeRows = [];
let nextDbId = 1;
let failNextWriteForId = null; // cook-done 중간 쓰기 실패(partiallyApplied 등) 재현용

function checkFailure(id) {
  if (failNextWriteForId !== id) return false;
  failNextWriteForId = null;
  return true;
}

function fridgeTable() {
  return {
    select() {
      return Promise.resolve({ data: fridgeRows.map((r) => ({ ...r })), error: null });
    },
    insert(payload) {
      const arr = Array.isArray(payload) ? payload : [payload];
      const inserted = arr.map((row) => ({ id: nextDbId++, ...row }));
      fridgeRows.push(...inserted);
      return Promise.resolve({ data: inserted, error: null });
    },
    update(patch) {
      return {
        eq(col, val) {
          if (col === 'id' && checkFailure(val)) return Promise.reject(new Error('mock write failure'));
          fridgeRows.forEach((r) => { if (r[col] === val) Object.assign(r, patch); });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
    delete() {
      return {
        eq(col, val) {
          if (col === 'id' && checkFailure(val)) return Promise.reject(new Error('mock write failure'));
          fridgeRows = fridgeRows.filter((r) => r[col] !== val);
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };
}

function recipesTable() {
  return {
    select() {
      return Promise.resolve({ count: 0, error: null, data: [] });
    },
  };
}

export const mockSupabaseClient = {
  from(table) {
    if (table === 'fridge_items') return fridgeTable();
    if (table === 'recipes') return recipesTable();
    throw new Error(`mockSupabaseClient: unsupported table "${table}"`);
  },
  reset(rows = []) {
    fridgeRows = rows.map((r) => ({ ...r }));
    nextDbId = fridgeRows.reduce((max, r) => Math.max(max, r.id || 0), 0) + 1;
    failNextWriteForId = null;
  },
  getRows() {
    return fridgeRows.map((r) => ({ ...r }));
  },
  // 다음 update/delete().eq('id', dbId) 호출을 딱 한 번 실패시킨다 — cook-done의
  // partiallyApplied/failed/notAttempted 응답을 재현하기 위한 용도.
  failNextWriteFor(dbId) {
    failNextWriteForId = dbId;
  },
};

// initialFridge.js({ pork: { items: [...] }, ... }) 형태를 fridge_items row 배열로 변환한다.
// fetchFridge()가 기대하는 컬럼명(ingredient_id, qty_amount, ...)에 맞춰야 재고가 있는 상태에서
// PATCH/DELETE 통합 테스트를 돌릴 수 있다.
export function initialFridgeToRows(initialFridge) {
  const rows = [];
  let id = 1;
  Object.entries(initialFridge).forEach(([ingredientId, stock]) => {
    (stock.items || []).forEach((item) => {
      rows.push({
        id: id++,
        ingredient_id: ingredientId,
        qty_amount: item.qtyAmount ?? null,
        qty_unit: item.qtyUnit ?? null,
        qty_label: item.qtyLabel ?? null,
        purchased: item.purchased,
        expiry: item.expiry,
        imminent: item.imminent,
      });
    });
  });
  return rows;
}
