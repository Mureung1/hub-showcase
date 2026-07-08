import { useMemo, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { booths, navItems, notices, schedules, today } from './data/festivalData'
import { BoothScreen } from './screens/BoothScreen'
import { HomeScreen } from './screens/HomeScreen'
import { NoticeScreen } from './screens/NoticeScreen'
import { TimetableScreen } from './screens/TimetableScreen'
import type { Booth, Notice, View } from './types/festival'
import { filterBooths, filterSchedules } from './utils/festivalFilters'
import './styles/app.css'

function App() {
  const [view, setView] = useState<View>('home')
  const [selectedDate, setSelectedDate] = useState(today)
  const [scheduleCategory, setScheduleCategory] = useState('전체')
  const [boothCategory, setBoothCategory] = useState('전체')
  const [boothQuery, setBoothQuery] = useState('')
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null)
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null)

  const visibleSchedules = useMemo(
    () => filterSchedules(schedules, selectedDate, scheduleCategory),
    [scheduleCategory, selectedDate],
  )

  const visibleBooths = useMemo(
    () => filterBooths(booths, selectedDate, boothCategory, boothQuery),
    [boothCategory, boothQuery, selectedDate],
  )

  const openView = (nextView: View) => {
    setView(nextView)
    setSelectedBooth(null)
    setSelectedNotice(null)
  }

  const renderContent = () => {
    if (view === 'timetable') {
      return (
        <TimetableScreen
          category={scheduleCategory}
          date={selectedDate}
          items={visibleSchedules}
          onCategoryChange={setScheduleCategory}
          onDateChange={setSelectedDate}
        />
      )
    }

    if (view === 'booths') {
      return (
        <BoothScreen
          booth={selectedBooth}
          booths={visibleBooths}
          category={boothCategory}
          date={selectedDate}
          query={boothQuery}
          onBack={() => setSelectedBooth(null)}
          onCategoryChange={setBoothCategory}
          onDateChange={setSelectedDate}
          onQueryChange={setBoothQuery}
          onSelectBooth={setSelectedBooth}
        />
      )
    }

    if (view === 'notices' || view === 'more') {
      return (
        <NoticeScreen
          notice={selectedNotice}
          notices={notices}
          onBack={() => setSelectedNotice(null)}
          onSelectNotice={setSelectedNotice}
        />
      )
    }

    return <HomeScreen onOpenView={openView} />
  }

  return (
    <div className="app-shell">
      <main className="app" aria-live="polite">
        {renderContent()}
      </main>

      <BottomNav activeView={view} items={navItems} onNavigate={openView} />
    </div>
  )
}

export default App
