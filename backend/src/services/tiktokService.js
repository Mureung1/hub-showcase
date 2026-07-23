/**
 * TikTok API 서비스
 * 트렌딩 음악, 효과, 해시태그 활용
 */

import axios from 'axios';

const TIKTOK_API_BASE = 'https://api.tiktok.com/v1';
const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;

/**
 * TikTok 트렌딩 음악 조회
 * (현재 Mock - 실제 API는 비공개)
 */
export async function getTrendingAudios(category = 'food', limit = 5) {
  try {
    // Mock 데이터: 실제 TikTok 인기 음악
    const trendingAudios = [
      {
        id: 'trending_1',
        name: '중독적인 비트',
        duration: 15000,
        category: 'upbeat',
        url: 'https://cdn-preview.tiktok.com/trending_audio_1.mp3'
      },
      {
        id: 'trending_2',
        name: '카페 분위기 음악',
        duration: 15000,
        category: 'calm',
        url: 'https://cdn-preview.tiktok.com/trending_audio_2.mp3'
      },
      {
        id: 'trending_3',
        name: '흥미로운 전환',
        duration: 15000,
        category: 'transition',
        url: 'https://cdn-preview.tiktok.com/trending_audio_3.mp3'
      }
    ];

    console.log(`[TikTok] 트렌딩 음악 ${trendingAudios.length}개 로드`);

    return {
      success: true,
      data: trendingAudios.slice(0, limit)
    };
  } catch (error) {
    console.error('[TikTok] 트렌딩 음악 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * TikTok 트렌딩 해시태그 조회
 */
export async function getTrendingHashtags(category = 'food', limit = 10) {
  try {
    // Mock 데이터: 실제 트렌딩 해시태그
    const trendingHashtags = [
      { tag: '#신메뉴', views: 15000000, trend_score: 9.5 },
      { tag: '#카페', views: 25000000, trend_score: 9.2 },
      { tag: '#디저트', views: 18000000, trend_score: 8.8 },
      { tag: '#음식점', views: 12000000, trend_score: 8.5 },
      { tag: '#라떼', views: 8500000, trend_score: 8.2 },
      { tag: '#한입거리', views: 7200000, trend_score: 7.9 },
      { tag: '#겉바속촉', views: 14500000, trend_score: 7.6 },
      { tag: '#빵지순례', views: 11000000, trend_score: 7.3 },
      { tag: '#카페감성', views: 9800000, trend_score: 7.0 },
      { tag: '#먹방', views: 32000000, trend_score: 8.9 }
    ];

    console.log(`[TikTok] 트렌딩 해시태그 ${trendingHashtags.length}개 로드`);

    return {
      success: true,
      data: trendingHashtags.slice(0, limit)
    };
  } catch (error) {
    console.error('[TikTok] 트렌딩 해시태그 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * TikTok 비디오 최적화 설정
 * (해상도, 음량, 효과 등)
 */
export function getVideoOptimizationSettings() {
  return {
    // 영상 설정
    video: {
      resolution: '1080x1920',  // 9:16 세로 영상
      fps: 30,
      bitrate: '3000k',
      codec: 'h264'
    },

    // 음성 설정
    audio: {
      bitrate: '128k',
      samplerate: 44100,
      channels: 2  // 스테레오
    },

    // 자막 설정 (TikTok 스타일)
    subtitles: {
      fontsize: 28,
      fontcolor: 'white',
      backgroundColor: 'black',
      opacity: 0.7,
      position: 'bottom',  // 하단 배치
      animation: 'fade_in_scale'  // 페이드인 + 크기 확대
    },

    // 효과 설정
    effects: {
      ken_burns: true,  // 줌 인/아웃
      color_correction: true,  // 색상 보정
      brightness_boost: 1.1  // 밝기 10% 상향
    }
  };
}

/**
 * TikTok 게시 권장 텍스트 생성
 */
export function generateTikTokCaption(productName, hashtags = []) {
  const openingHooks = [
    '⭐ 이거 봐야 해!',
    '🔥 요즘 핫한 이건데?',
    '😍 하나 먹어봐!',
    '✨ 신메뉴 공개!',
    '👀 어? 이게 뭐야?'
  ];

  const closingCTA = [
    '→ 프로필 링크에서 예약하기',
    '→ 지금 바로 방문하세요!',
    '→ 댓글로 의견 남겨주세요',
    '→ 저장하고 나중에 보기'
  ];

  const randomOpening = openingHooks[Math.floor(Math.random() * openingHooks.length)];
  const randomCTA = closingCTA[Math.floor(Math.random() * closingCTA.length)];

  const caption = `${randomOpening}

${productName}가 뭐냐구?
이거야기 🎥

${hashtags.join(' ')}

${randomCTA}`;

  return caption;
}

export default {
  getTrendingAudios,
  getTrendingHashtags,
  getVideoOptimizationSettings,
  generateTikTokCaption
};
