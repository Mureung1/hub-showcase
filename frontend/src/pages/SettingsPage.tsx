import { useEffect, useState } from 'react'
import { profileApi, tokenManager } from '../utils/apiClient'

interface SettingsPageProps {
  setCurrentPage?: (page: 'auth' | 'profile' | 'dashboard' | 'calendar' | 'scraps' | 'settings') => void
}

interface ProfileData {
  major?: string
  grade?: number
  residenceRegion?: string
  incomeBracket?: number
  interestTags?: string[]
}

const MAJOR_OPTIONS = [
  '공학',
  '자연과학',
  '사회과학',
  '인문학',
  '예술',
  '비즈니스',
  '의료/보건',
  '기타',
]

const REGION_OPTIONS = [
  '서울',
  '경기',
  '인천',
  '강원',
  '충청',
  '전라',
  '경상',
  '제주',
]

const GRADE_OPTIONS = [1, 2, 3, 4]

const INCOME_BRACKETS = [
  { value: 1, label: '1분위 (0~10%)' },
  { value: 2, label: '2분위 (10~20%)' },
  { value: 3, label: '3분위 (20~30%)' },
  { value: 4, label: '4분위 (30~40%)' },
  { value: 5, label: '5분위 (40~50%)' },
  { value: 6, label: '6분위 (50~60%)' },
  { value: 7, label: '7분위 (60~70%)' },
  { value: 8, label: '8분위 (70~80%)' },
  { value: 9, label: '9분위 (80~90%)' },
  { value: 10, label: '10분위 (90~100%)' },
]

const INTEREST_TAGS = [
  '개발',
  '디자인',
  '마케팅',
  '영업',
  'PM',
  '데이터',
  '기획',
  '문화',
  '금융',
  '공공기관',
  '교육',
  '환경',
]

export default function SettingsPage({ setCurrentPage }: SettingsPageProps) {
  const [profile, setProfile] = useState<ProfileData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'notifications'>('profile')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const response = await profileApi.fetch()
      console.log('프로필 로드 전체 응답:', response)

      // 응답이 직접 프로필 객체 또는 ApiResponse 형태
      const profileData = response?.data || response
      console.log('추출된 프로필 데이터:', profileData)
      console.log('major:', profileData?.major)
      console.log('grade:', profileData?.grade)
      console.log('residenceRegion:', profileData?.residenceRegion)
      console.log('incomeBracket:', profileData?.incomeBracket)
      console.log('interestTags:', profileData?.interestTags)

      if (profileData) {
        setProfile({
          major: profileData.major || '',
          grade: profileData.grade || undefined,
          residenceRegion: profileData.residenceRegion || '',
          incomeBracket: profileData.incomeBracket || undefined,
          interestTags: Array.isArray(profileData.interestTags) ? profileData.interestTags : [],
        })
      }
    } catch (error: any) {
      console.error('프로필 로드 실패:', error)
      setMessage({ type: 'error', text: '프로필을 불러올 수 없습니다' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true)
      const response = await profileApi.update(profile)
      if (response?.data) {
        setMessage({ type: 'success', text: '프로필이 성공적으로 저장되었습니다! 🎉' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error: any) {
      console.error('프로필 저장 실패:', error)
      setMessage({ type: 'error', text: error.message || '프로필 저장 실패' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    if (window.confirm('로그아웃하시겠습니까?')) {
      tokenManager.clearTokens()
      setCurrentPage?.('auth')
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
      {/* 좌측 사이드바 */}
      <aside style={{
        width: '220px',
        minWidth: '220px',
        backgroundColor: '#fff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 14px',
        overflowY: 'auto',
      }}>
        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px 20px' }}>
          <div style={{ width: '28px', height: '28px', backgroundColor: '#111', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>U</span>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.3px' }}>UniBoard</span>
        </div>

        {/* 네비게이션 */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[
            { label: '⊞ 대시보드', page: 'dashboard' as const },
            { label: '♡ 내 스크랩', page: 'scraps' as const },
            { label: '📅 캘린더', page: 'calendar' as const },
            { label: '⚙ 프로필 설정', page: 'settings' as const },
          ].map((item, i) => (
            <div
              key={i}
              onClick={() => setCurrentPage?.(item.page)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '9px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: i === 3 ? 600 : 500,
                backgroundColor: i === 3 ? '#f5f5f5' : 'transparent',
                transition: 'all 100ms',
              }}>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* 로그아웃 버튼 */}
        <button
          onClick={handleLogout}
          style={{
            marginTop: 'auto',
            padding: '10px 12px',
            backgroundColor: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 120ms',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
        >
          🚪 로그아웃
        </button>
      </aside>

      {/* 메인 콘텐츠 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
        {/* 헤더 */}
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ padding: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>
              ⚙ 프로필 설정
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>
              개인정보를 관리하고 환경설정을 변경합니다
            </p>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* 알림 메시지 */}
          {message && (
            <div
              style={{
                marginBottom: '24px',
                padding: '12px 16px',
                backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
                borderRadius: '8px',
                fontSize: '13px',
                color: message.type === 'success' ? '#166534' : '#ef4444',
              }}
            >
              {message.text}
            </div>
          )}

          {/* 로딩 상태 */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div
                style={{
                  display: 'inline-block',
                  animation: 'spin 1s linear infinite',
                  width: '48px',
                  height: '48px',
                  border: '2px solid #6366f1',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                }}
              ></div>
              <p style={{ marginTop: '16px', color: '#6b7280', fontSize: '13px' }}>
                프로필을 불러오는 중...
              </p>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '32px', color: '#111' }}>
                📋 기본 정보
              </h2>

              {/* 폼 그리드 레이아웃 (2열) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '32px',
                marginBottom: '32px',
              }}>
                {/* 전공 */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#111' }}>
                    전공
                  </label>
                  <select
                    value={profile.major || ''}
                    onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">선택하세요</option>
                    {MAJOR_OPTIONS.map((major) => (
                      <option key={major} value={major}>
                        {major}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 학년 */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#111' }}>
                    학년
                  </label>
                  <select
                    value={profile.grade || ''}
                    onChange={(e) => setProfile({ ...profile, grade: e.target.value ? parseInt(e.target.value) : undefined })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">선택하세요</option>
                    {GRADE_OPTIONS.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}학년
                      </option>
                    ))}
                  </select>
                </div>

                {/* 거주지 */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#111' }}>
                    거주지
                  </label>
                  <select
                    value={profile.residenceRegion || ''}
                    onChange={(e) => setProfile({ ...profile, residenceRegion: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">선택하세요</option>
                    {REGION_OPTIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 소득분위 */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#111' }}>
                    소득분위
                  </label>
                  <select
                    value={profile.incomeBracket || ''}
                    onChange={(e) => setProfile({ ...profile, incomeBracket: e.target.value ? parseInt(e.target.value) : undefined })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">선택하세요</option>
                    {INCOME_BRACKETS.map((bracket) => (
                      <option key={bracket.value} value={bracket.value}>
                        {bracket.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 관심 분야 (전체 너비) */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '14px', color: '#111' }}>
                  관심 분야
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {INTEREST_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        const tags = profile.interestTags || []
                        if (tags.includes(tag)) {
                          setProfile({ ...profile, interestTags: tags.filter((t) => t !== tag) })
                        } else {
                          setProfile({ ...profile, interestTags: [...tags, tag] })
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: profile.interestTags?.includes(tag) ? '#6366f1' : '#fff',
                        color: profile.interestTags?.includes(tag) ? '#fff' : '#6b7280',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 120ms',
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 저장 버튼 */}
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.6 : 1,
                  transition: 'all 120ms',
                }}
              >
                {isSaving ? '저장 중...' : '💾 저장하기'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
