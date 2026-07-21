// 백엔드 서버 주소 (Vite 프록시 사용)
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

export async function getTrends(category) {
  try {
    const response = await fetch(`${API_BASE}/trends?category=${encodeURIComponent(category)}`);

    if (!response.ok) {
      throw new Error('트렌드 데이터 조회에 실패했습니다');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

export async function uploadImage(file, storeId) {
  try {
    if (!storeId) {
      throw new Error('가게 정보가 필요합니다');
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('store_id', storeId);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '이미지 업로드에 실패했습니다');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    throw error;
  }
}

export async function getUploadedImages(storeId) {
  try {
    const response = await fetch(`${API_BASE}/upload/${storeId}`);

    if (!response.ok) {
      throw new Error('업로드된 이미지 목록 조회에 실패했습니다');
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    throw error;
  }
}

export async function deleteImage(imageId) {
  try {
    const response = await fetch(`${API_BASE}/upload/${imageId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '이미지 삭제에 실패했습니다');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

export async function publishVideo(videoData) {
  try {
    const { video_id, video_url, platform, store_id, hashtags, title } = videoData;

    if (!video_id || !video_url || !platform || !store_id) {
      throw new Error('필수 정보가 부족합니다');
    }

    const response = await fetch(`${API_BASE}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_id,
        video_url,
        platform,
        store_id,
        hashtags: hashtags || '',
        title: title || '생성된 릴스'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `${platform} 발행에 실패했습니다`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

export async function getPublishHistory(storeId) {
  try {
    const response = await fetch(`${API_BASE}/publish/${storeId}`);

    if (!response.ok) {
      throw new Error('발행 기록 조회에 실패했습니다');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

// ===== AI 파이프라인 관련 함수 =====

export async function startGeneration(storeId, uploadedImageUrl, trendHashtag, purpose, mood) {
  try {
    if (!storeId || !uploadedImageUrl || !trendHashtag || !purpose || !mood) {
      throw new Error('필수 정보가 부족합니다');
    }

    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_id: storeId,
        image_url: uploadedImageUrl,
        trend_hashtag: trendHashtag,
        purpose: purpose,
        mood: mood
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '영상 생성을 시작할 수 없습니다');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

export async function pollGenerationStatus(jobId) {
  try {
    if (!jobId) {
      throw new Error('Job ID가 필요합니다');
    }

    const response = await fetch(`${API_BASE}/generate/${jobId}`);

    if (!response.ok) {
      throw new Error('진행 상황 조회에 실패했습니다');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

export async function getGenerationResult(jobId) {
  try {
    if (!jobId) {
      throw new Error('Job ID가 필요합니다');
    }

    const response = await fetch(`${API_BASE}/generate/${jobId}/result`);

    if (!response.ok) {
      throw new Error('생성 결과 조회에 실패했습니다');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}
