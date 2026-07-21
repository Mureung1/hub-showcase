export const SELECTED_STORE_ID_KEY = "selectedStoreId";

export function getSelectedStoreId() {
  return localStorage.getItem(SELECTED_STORE_ID_KEY);
}

export function setSelectedStoreId(storeId: string) {
  localStorage.setItem(SELECTED_STORE_ID_KEY, storeId);
}

export function clearSelectedStoreId() {
  localStorage.removeItem(SELECTED_STORE_ID_KEY);
}
