// 실제 Express 백엔드(backend/)를 호출하는 API 클라이언트.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function request(method, path, body) {
  // FormData(사진 업로드)는 JSON으로 직렬화하면 안 되고, Content-Type도 브라우저가 boundary를
  // 붙여 직접 설정해야 하므로 여기서 지정하지 않는다 — 지정하면 boundary가 빠져 서버가 못 읽는다.
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body && !isFormData ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  } catch (networkErr) {
    console.error("Network error during fetch:", networkErr);
    // fetch 자체 실패 (서버 다운, 네트워크 없음 등)
    throw new Error('서버에 연결할 수 없어요. 인터넷 연결을 확인하거나 잠시 후 다시 시도해 주세요.');
  }
  if (res.status === 204) return undefined;
  let data;
  try {
    data = await res.json();
  } catch (parseErr) {
    console.error("Error parsing JSON response:", parseErr);
    // 서버가 죽거나 프록시가 빈 응답을 돌려줄 때 res.json()이 "Unexpected end of JSON input"
    // 같은 저수준 에러를 던진다 — 사용자에게는 fetch 자체 실패와 동일한 안내를 준다.
    throw new Error('서버에 연결할 수 없어요. 인터넷 연결을 확인하거나 잠시 후 다시 시도해 주세요.');
  }
  if (!res.ok) throw new Error(data.error || `${method} ${path} 요청 실패 (${res.status})`);
  return data;
}

export const getFridge = () => request('GET', '/api/fridge');
export const addFridgeItem = (payload) => request('POST', '/api/fridge', payload);
export const updateFridgeItem = (id, patch) => request('PATCH', `/api/fridge/${id}`, patch);
export const deleteFridgeItem = (id) => request('DELETE', `/api/fridge/${id}`);
export const getExpiryAlerts = () => request('GET', '/api/fridge/alerts');

export const uploadReceipt = (file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return request('POST', '/api/receipts', formData);
};
export const confirmReceipt = (receiptId, body) => request('POST', `/api/receipts/${receiptId}/confirm`, body);

export const getRecipes = ({ filter = 'all', level = 'all', category = 'all', search = '', page = 1, pageSize = 30, sort = 'default' } = {}) =>
  request('GET', `/api/recipes?filter=${encodeURIComponent(filter)}&level=${encodeURIComponent(level)}&category=${encodeURIComponent(category)}&search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}&sort=${encodeURIComponent(sort)}`);
export const getRecipeDetail = (id, multiplier = 1.0) => request('GET', `/api/recipes/${id}?multiplier=${multiplier}`);
export const cookDone = (recipeId, body) => request('POST', `/api/recipes/${recipeId}/cook-done`, body);

export const getShoppingSets = ({ match = 'all', level = 'all', pickedIds = [], multiplier = 1.0, shareMealCount = 3 } = {}) =>
  request('GET', `/api/shopping/sets?match=${encodeURIComponent(match)}&level=${encodeURIComponent(level)}&pickedIds=${encodeURIComponent(pickedIds.join(','))}&multiplier=${multiplier}&shareMealCount=${shareMealCount}`);
export const getShoppingList = (setId, pickedIds = [], multiplier = 1.0, shareMealCount = 3) => request('GET', `/api/shopping/list?setId=${encodeURIComponent(setId ?? '')}&pickedIds=${encodeURIComponent(pickedIds.join(','))}&multiplier=${multiplier}&shareMealCount=${shareMealCount}`);

export const getIngredients = () => request('GET', '/api/ingredients');
export const getPrices = () => request('GET', '/api/prices');

export const getMealPlanCandidates = () => request('GET', '/api/meal-plan/candidates');
export const buildWeeklyPlan = (pickedIds, difficulty = 'all', type = 'meal') => request('POST', '/api/meal-plan/weekly', { pickedIds, difficulty, type });
export const getMealShoppingList = (weekPlanIds, multiplier = 1.0) => request('POST', '/api/meal-plan/shopping-list', { weekPlanIds, multiplier });

export const getPushPublicKey = () => request('GET', '/api/push/public-key');
export const subscribePush = (subscription) => request('POST', '/api/push/subscribe', subscription);
