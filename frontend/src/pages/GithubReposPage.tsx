import { useEffect, useState } from 'react'
import { githubApi, GithubRepo } from '../services/githubApi'
import { profileApi } from '../utils/apiClient'
import RepoCard from '../components/RepoCard'

interface GithubReposPageProps {
  setCurrentPage?: (page: 'auth' | 'profile' | 'dashboard' | 'calendar' | 'scraps' | 'settings' | 'github') => void
}

type FilterTab = 'trending' | 'search'

export default function GithubReposPage({ setCurrentPage }: GithubReposPageProps) {
  const [repos, setRepos] = useState<GithubRepo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<FilterTab>('trending')
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [llmInfo, setLlmInfo] = useState<any>(null)
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null)
  const [isCollecting, setIsCollecting] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  const languages = ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'C#']

  const loadProfile = async () => {
    try {
      const response = await profileApi.fetch()
      if (response?.id || response?.userId) {
        setProfile(response)
      } else if (response?.data) {
        setProfile(response.data)
      }
    } catch (err: any) {
      console.error('❌ 프로필 로드 실패:', err)
      if (err.message?.includes('인증') || err.message?.includes('토큰')) {
        setCurrentPage?.('auth')
      }
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        await loadProfile()
        const llmStatus = await githubApi.getLlmStatus()
        if (llmStatus) {
          setLlmInfo(llmStatus)
        }
        const trendingRepos = await githubApi.getTrendingRepos(20)
        setRepos(trendingRepos)
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터 로드 실패')
        console.error('❌ 초기 로드 오류:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [])

  const handleLanguageSelect = async (language: string | null) => {
    try {
      setIsLoading(true)
      setError(null)
      setSelectedLanguage(language)
      setSelectedTab('trending')

      if (language) {
        const filtered = await githubApi.getReposByLanguage(language, 20)
        setRepos(filtered)
      } else {
        const trending = await githubApi.getTrendingRepos(20)
        setRepos(trending)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '필터링 실패')
      console.error('❌ 필터링 오류:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setSelectedTab('search')
      setSelectedLanguage(null)

      const results = await githubApi.searchRepos(searchQuery, 20)
      setRepos(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 실패')
      console.error('❌ 검색 오류:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCollectRepos = async () => {
    try {
      setIsCollecting(true)
      setError(null)

      await githubApi.collectRepos(undefined, 10)
      alert('✅ 저장소 수집이 시작되었습니다. 잠시 후 새로고침해 주세요.')

      setTimeout(async () => {
        try {
          const trending = await githubApi.getTrendingRepos(20)
          setRepos(trending)
        } catch (err) {
          console.error('새로고침 오류:', err)
        }
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '수집 실패')
      console.error('❌ 수집 오류:', err)
    } finally {
      setIsCollecting(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
      {/* ===== 좌측 사이드바 ===== */}
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

        {/* 프로필 박스 */}
        <div style={{ backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '12px', marginBottom: '20px' }}>
          {profile ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                    {(profile as any).nickname?.charAt(0).toUpperCase() || profile.userId?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.3 }}>
                    {(profile as any).nickname || profile.userId || '사용자'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.3 }}>{profile.major || '전공미정'} {profile.grade || ''}학년</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {profile.major && (
                  <span style={{ backgroundColor: '#ede9fe', color: '#6366f1', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px' }}>
                    {profile.major}
                  </span>
                )}
                {profile.grade && (
                  <span style={{ backgroundColor: '#f5f5f5', color: '#374151', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px' }}>
                    {profile.grade}학년
                  </span>
                )}
                {profile.residenceRegion && (
                  <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '9999px' }}>
                    {profile.residenceRegion}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '12px', color: '#6b7280', padding: '8px 0' }}>프로필을 불러오는 중...</div>
          )}
        </div>

        {/* 네비게이션 */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          {[
            { label: '⊞ 대시보드', page: 'dashboard' as const },
            { label: '♡ 내 스크랩', page: 'scraps' as const },
            { label: '📅 캘린더', page: 'calendar' as const },
            { label: '⭐ GitHub 저장소', page: 'github' as const },
            { label: '⚙ 환경설정', page: 'settings' as const },
          ].map((item, i) => {
            const isActive = item.page === 'github'
            return (
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
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? '#f5f5f5' : 'transparent',
                  transition: 'all 100ms',
                }}>
                <span>{item.label}</span>
              </div>
            )
          })}
        </nav>

        {/* LLM 상태 카드 */}
        {llmInfo && (
          <div style={{
            marginTop: '16px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderLeft: '3px solid #0284c7',
            borderRadius: '8px',
            padding: '12px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#0284c7', marginBottom: '4px' }}>🤖 LLM 서비스</div>
            <div style={{ fontSize: '12px', color: '#0369a1', lineHeight: 1.4 }}>
              {llmInfo.provider} ({llmInfo.model})
            </div>
          </div>
        )}
      </aside>

      {/* ===== 메인 영역 ===== */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 상단바 */}
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', flexShrink: 0 }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>GitHub 인기 저장소</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>매월 인기있는 개발 프로젝트를 한국어로 요약했습니다</p>
        </div>

        {/* 메인 컨텐츠 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* 검색 및 수집 */}
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 검색 폼 */}
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="저장소명, 설명으로 검색..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
                  onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    opacity: isLoading ? 0.5 : 1,
                    transition: 'all 200ms',
                  }}
                  onMouseEnter={e => !isLoading && (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                  onMouseLeave={e => !isLoading && (e.currentTarget.style.backgroundColor = '#2563eb')}
                >
                  검색
                </button>
              </form>

              {/* 수집 버튼 */}
              <button
                onClick={handleCollectRepos}
                disabled={isCollecting || isLoading}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  backgroundColor: '#16a34a',
                  color: '#fff',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  opacity: isCollecting || isLoading ? 0.5 : 1,
                  transition: 'all 200ms',
                }}
                onMouseEnter={e => !isCollecting && !isLoading && (e.currentTarget.style.backgroundColor = '#15803d')}
                onMouseLeave={e => !isCollecting && !isLoading && (e.currentTarget.style.backgroundColor = '#16a34a')}
              >
                {isCollecting ? '⏳ 저장소 수집 중...' : '✨ 새 저장소 수집하기'}
              </button>
            </div>
          </div>

          {/* 언어 필터 */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937', marginBottom: '12px' }}>언어별 필터</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                onClick={() => handleLanguageSelect(null)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontWeight: 500,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: selectedLanguage === null ? '#2563eb' : '#e5e7eb',
                  color: selectedLanguage === null ? '#fff' : '#1f2937',
                  transition: 'all 200ms',
                }}
              >
                전체
              </button>
              {languages.map(lang => (
                <button
                  key={lang}
                  onClick={() => handleLanguageSelect(lang)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontWeight: 500,
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedLanguage === lang ? '#2563eb' : '#e5e7eb',
                    color: selectedLanguage === lang ? '#fff' : '#1f2937',
                    transition: 'all 200ms',
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px' }}>
              <p style={{ color: '#991b1b', fontWeight: 500, fontSize: '13px' }}>❌ {error}</p>
            </div>
          )}

          {/* 로딩 상태 */}
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid #dbeafe',
                  borderTop: '4px solid #2563eb',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px',
                }}></div>
                <p style={{ color: '#4b5563', fontSize: '13px' }}>저장소를 불러오는 중...</p>
              </div>
            </div>
          ) : repos.length === 0 ? (
            <div style={{ textAlign: 'center', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: '15px', fontWeight: 500 }}>저장소가 없습니다</p>
                <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '8px' }}>✨ 새 저장소 수집하기 버튼을 눌러주세요</p>
              </div>
            </div>
          ) : (
            <>
              {/* 결과 수 */}
              <div style={{ marginBottom: '16px', fontSize: '13px', color: '#6b7280' }}>
                총 <span style={{ fontWeight: 600, color: '#1f2937' }}>{repos.length}</span>개의 저장소
                {selectedLanguage && ` (${selectedLanguage})`}
                {selectedTab === 'search' && ` - 검색 결과`}
              </div>

              {/* 저장소 카드 그리드 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px',
              }}>
                {repos.map(repo => (
                  <RepoCard
                    key={repo.githubId}
                    repo={repo}
                    onSelect={setSelectedRepo}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* 상세 보기 모달 */}
      {selectedRepo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 50,
          }}
          onClick={() => setSelectedRepo(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div style={{
              position: 'sticky',
              top: 0,
              backgroundColor: '#fff',
              borderBottom: '1px solid #e5e7eb',
              padding: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '16px',
            }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>{selectedRepo.name}</h2>
                <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '13px' }}>{selectedRepo.owner}/{selectedRepo.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', fontSize: '13px' }}>
                  {selectedRepo.language && (
                    <span style={{ fontWeight: 500, color: '#2563eb' }}>{selectedRepo.language}</span>
                  )}
                  <span style={{ color: '#6b7280' }}>⭐ {selectedRepo.stars} Stars</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedRepo(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#9ca3af',
                }}
              >
                ✕
              </button>
            </div>

            {/* 모달 컨텐츠 */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {selectedRepo.description && (
                <div>
                  <h3 style={{ fontWeight: 600, color: '#1f2937', marginBottom: '8px', fontSize: '14px' }}>설명</h3>
                  <p style={{ color: '#374151', fontSize: '13px', lineHeight: 1.6 }}>{selectedRepo.description}</p>
                </div>
              )}

              {selectedRepo.summary && (
                <div>
                  <h3 style={{ fontWeight: 600, color: '#1f2937', marginBottom: '8px', fontSize: '14px' }}>한국어 요약</h3>
                  <p style={{ color: '#374151', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedRepo.summary}</p>
                </div>
              )}

              {selectedRepo.summaryBullets && selectedRepo.summaryBullets.length > 0 && (
                <div>
                  <h3 style={{ fontWeight: 600, color: '#1f2937', marginBottom: '8px', fontSize: '14px' }}>핵심 포인트</h3>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedRepo.summaryBullets.map((bullet, idx) => (
                      <li key={idx} style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#374151' }}>
                        <span style={{ color: '#2563eb', fontWeight: 700, flexShrink: 0 }}>•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 style={{ fontWeight: 600, color: '#1f2937', marginBottom: '12px', fontSize: '14px' }}>통계</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ backgroundColor: '#f9fafb', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>⭐ {selectedRepo.stars}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Stars</div>
                  </div>
                  <div style={{ backgroundColor: '#f9fafb', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>🍴 {selectedRepo.forks}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Forks</div>
                  </div>
                  <div style={{ backgroundColor: '#f9fafb', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>📋 {selectedRepo.openIssues}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Issues</div>
                  </div>
                </div>
              </div>

              {selectedRepo.topics && selectedRepo.topics.length > 0 && (
                <div>
                  <h3 style={{ fontWeight: 600, color: '#1f2937', marginBottom: '8px', fontSize: '14px' }}>Topics</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedRepo.topics.map(topic => (
                      <span
                        key={topic}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#eff6ff',
                          color: '#1e40af',
                          borderRadius: '20px',
                          fontSize: '12px',
                        }}
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <a
                  href={selectedRepo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: '#1f2937',
                    color: '#fff',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontWeight: 500,
                    fontSize: '13px',
                    textDecoration: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#111827'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1f2937'}
                >
                  GitHub 보러가기 ↗
                </a>
                {selectedRepo.homepageUrl && (
                  <a
                    href={selectedRepo.homepageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      backgroundColor: '#fff',
                      color: '#1f2937',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      textAlign: 'center',
                      fontWeight: 500,
                      fontSize: '13px',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'all 200ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                  >
                    홈페이지 ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
