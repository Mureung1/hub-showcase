import { LAYOUT, COLORS } from '../../constants'

interface TopbarProps {
  storeName?: string
  analysisStatus?: 'idle' | 'loading' | 'success' | 'error'
}

export const Topbar: React.FC<TopbarProps> = ({
  storeName = 'GS25 강남역점',
  analysisStatus = 'success',
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loading':
        return '#FFA500'
      case 'success':
        return COLORS.success
      case 'error':
        return COLORS.danger
      default:
        return COLORS.textSecondary
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'loading':
        return '분석 중...'
      case 'success':
        return '분석 완료'
      case 'error':
        return '오류 발생'
      default:
        return '-'
    }
  }

  return (
    <header
      className="bg-bg-card border-b border-border-color fixed right-0 left-sidebar top-0 flex items-center justify-between px-8"
      style={{
        height: LAYOUT.topbarHeight,
        marginLeft: LAYOUT.sidebarWidth,
        width: `calc(100% - ${LAYOUT.sidebarWidth})`,
      }}
    >
      {/* Left: Store Name */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{storeName}</h2>
      </div>

      {/* Right: Status & Icons */}
      <div className="flex items-center gap-6">
        {/* Analysis Status */}
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getStatusColor(analysisStatus) }}
          ></div>
          <span className="text-sm text-text-secondary">
            {getStatusLabel(analysisStatus)}
          </span>
        </div>

        {/* Placeholder for additional icons */}
        <button className="p-2 hover:bg-bg-primary rounded transition-colors">
          <span className="text-lg">⚙️</span>
        </button>
      </div>
    </header>
  )
}
