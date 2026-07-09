import { useState, ReactNode } from 'react'
import { Sidebar } from '../components/common/Sidebar'
import { Topbar } from '../components/common/Topbar'
import { LAYOUT } from '../constants'

interface MainLayoutProps {
  children: ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState('dashboard')

  return (
    <div className="flex h-screen bg-bg-primary">
      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col"
        style={{ marginLeft: LAYOUT.sidebarWidth }}
      >
        {/* Topbar */}
        <Topbar analysisStatus="success" />

        {/* Scrollable Content */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ marginTop: LAYOUT.topbarHeight }}
        >
          <div
            className="max-w-7xl mx-auto"
            style={{
              padding: LAYOUT.mainPadding,
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
