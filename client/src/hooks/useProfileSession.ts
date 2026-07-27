import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'scholar_sync_profile_session';

export interface ProfileData {
  major: string;
  channels: string[];
  keywords: string[];
}

export interface ProfileSessionReturn extends ProfileData {
  userId: string;
  setMajor: (major: string) => void;
  toggleChannel: (channel: string) => void;
  addKeyword: (keyword: string) => void;
  removeKeyword: (index: number) => void;
}

export function useProfileSession(): ProfileSessionReturn {
  const { userId: authUserId } = useAuth();

  const [profile, setProfile] = useState<ProfileData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return {
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

    return {
      major: 'Technological University Dublin (TUD)',
      channels: ['arXiv', 'IEEE', 'NeurIPS'],
      keywords: [
        'Natural Language Processing',
        'Retrieval-Augmented Generation',
        'AI Agents'
      ]
    };
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

  // 구글 OAuth 로그인된 user.id가 있으면 최우선 사용, 없으면 guest-fallback 세션 생성
  const effectiveUserId = authUserId || getGuestUserId();

  return {
    ...profile,
    userId: effectiveUserId,
    setMajor,
    toggleChannel,
    addKeyword,
    removeKeyword
  };
}

function getGuestUserId(): string {
  const GUEST_KEY = 'scholar_sync_guest_id';
  let guestId = localStorage.getItem(GUEST_KEY);
  if (!guestId) {
    guestId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : 'guest-' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem(GUEST_KEY, guestId);
  }
  return guestId;
}
