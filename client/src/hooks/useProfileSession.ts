import { useState, useEffect } from 'react';

const STORAGE_KEY = 'scholar_sync_profile_session';

export interface ProfileData {
  userId: string;
  major: string;
  channels: string[];
  keywords: string[];
}

export interface ProfileSessionReturn extends ProfileData {
  setMajor: (major: string) => void;
  toggleChannel: (channel: string) => void;
  addKeyword: (keyword: string) => void;
  removeKeyword: (index: number) => void;
}

export function useProfileSession(): ProfileSessionReturn {
  // Lazy Initialization 패턴 적용: 초기 렌더링 시 1회만 localStorage 로드
  const [profile, setProfile] = useState<ProfileData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return {
            userId: parsed.userId || generateUUID(),
            major: parsed.major || 'Technological University Dublin (TUD)',
            channels: Array.isArray(parsed.channels) ? parsed.channels : ['arXiv', 'IEEE', 'NeurIPS'],
            keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [
              'Natural Language Processing',
              'Retrieval-Augmented Generation',
              'AI Agents'
            ]
          };
        }
      }
    } catch (e) {
      console.error('❌ Failed to parse profile session from localStorage:', e);
    }

    // 기본 프로필 세팅
    const defaultData: ProfileData = {
      userId: generateUUID(),
      major: 'Technological University Dublin (TUD)',
      channels: ['arXiv', 'IEEE', 'NeurIPS'],
      keywords: [
        'Natural Language Processing',
        'Retrieval-Augmented Generation',
        'AI Agents'
      ]
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    } catch (e) {
      console.error('❌ Failed to save default profile session to localStorage:', e);
    }
    return defaultData;
  });

  // 상태 변경 시 localStorage 동기화
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('❌ Failed to update profile session in localStorage:', e);
    }
  }, [profile]);

  const setMajor = (newMajor: string) => {
    setProfile(prev => ({ ...prev, major: newMajor }));
  };

  const toggleChannel = (channel: string) => {
    setProfile(prev => {
      const exists = prev.channels.includes(channel);
      const updatedChannels = exists
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel];
      return { ...prev, channels: updatedChannels };
    });
  };

  const addKeyword = (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setProfile(prev => {
      if (prev.keywords.includes(trimmed)) return prev;
      return { ...prev, keywords: [...prev.keywords, trimmed] };
    });
  };

  const removeKeyword = (index: number) => {
    setProfile(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, idx) => idx !== index)
    }));
  };

  return {
    ...profile,
    setMajor,
    toggleChannel,
    addKeyword,
    removeKeyword
  };
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'user-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
}
