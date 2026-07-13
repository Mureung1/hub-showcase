const API_BASE = '/api';

export async function saveStoreInfo(data) {
  try {
    const response = await fetch(`${API_BASE}/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '가게 정보 저장에 실패했습니다');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

export async function getStoreInfo(storeId) {
  try {
    const response = await fetch(`${API_BASE}/store/${storeId}`);

    if (!response.ok) {
      throw new Error('가게 정보 조회에 실패했습니다');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

export async function getLatestStore() {
  try {
    const response = await fetch(`${API_BASE}/store/latest`);

    if (!response.ok) {
      throw new Error('최신 가게 정보 조회에 실패했습니다');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}
