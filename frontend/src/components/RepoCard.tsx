import { GithubRepo } from '../services/githubApi'

interface RepoCardProps {
  repo: GithubRepo
  onSelect?: (repo: GithubRepo) => void
}

export default function RepoCard({ repo, onSelect }: RepoCardProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getLanguageColor = (language: string | null): string => {
    if (!language) return 'bg-gray-200'
    const colorMap: Record<string, string> = {
      'JavaScript': 'bg-yellow-200',
      'TypeScript': 'bg-blue-200',
      'Python': 'bg-blue-300',
      'Go': 'bg-cyan-300',
      'Rust': 'bg-orange-300',
      'Java': 'bg-red-200',
      'C++': 'bg-blue-400',
      'C#': 'bg-purple-200',
      'PHP': 'bg-indigo-200',
    }
    return colorMap[language] || 'bg-gray-100'
  }

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer group"
      onClick={() => onSelect?.(repo)}
    >
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600">
              {repo.name}
            </h3>
            <p className="text-xs text-gray-500 truncate mt-1">
              {repo.owner} / {repo.name}
            </p>
          </div>
          {repo.language && (
            <span className={`${getLanguageColor(repo.language)} px-2 py-1 rounded text-xs font-medium text-gray-800 whitespace-nowrap`}>
              {repo.language}
            </span>
          )}
        </div>
      </div>

      {/* 설명 */}
      <div className="p-4">
        <p className="text-sm text-gray-700 line-clamp-2">
          {repo.description || '설명 없음'}
        </p>

        {/* 요약 (있으면 표시) */}
        {repo.summary && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600 line-clamp-2 italic">
              {repo.summary}
            </p>
          </div>
        )}

        {/* Bullet Points */}
        {repo.summaryBullets && repo.summaryBullets.length > 0 && (
          <div className="mt-2 space-y-1">
            {repo.summaryBullets.slice(0, 2).map((bullet, idx) => (
              <div key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span className="line-clamp-1">{bullet}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 통계 */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">⭐</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatNumber(repo.stars)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600">🍴</span>
            <span className="text-sm text-gray-600">
              {formatNumber(repo.forks)}
            </span>
          </div>
        </div>
        {repo.homepageUrl && (
          <a
            href={repo.homepageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            onClick={e => e.stopPropagation()}
          >
            홈페이지 ↗
          </a>
        )}
      </div>

      {/* GitHub 링크 */}
      <a
        href={repo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-4 py-2 bg-gray-900 text-white text-center text-sm font-medium hover:bg-gray-800 transition-colors"
        onClick={e => e.stopPropagation()}
      >
        GitHub에서 보기
      </a>
    </div>
  )
}
