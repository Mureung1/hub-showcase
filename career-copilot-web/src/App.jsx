import { useState } from 'react'
import { me, companies } from './data/mockData.js'
import Header from './components/Header.jsx'
import CompanyList from './components/CompanyList.jsx'
import FitPanel from './components/FitPanel.jsx'

// App = 상태의 주인.
//  - selectedId(어느 회사를 보고 있나)와 theme를 여기서 들고,
//  - 자식에겐 값(props)과 "바꾸는 함수"를 내려준다. (상태 끌어올리기)
export default function App() {
  const [selectedId, setSelectedId] = useState(companies[0].id)
  const [theme, setTheme] = useState('light')

  const selected = companies.find((c) => c.id === selectedId)
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  return (
    <div className="app" data-theme={theme}>
      <Header me={me} theme={theme} onToggleTheme={toggleTheme} />
      <main className="layout">
        <CompanyList
          companies={companies}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <FitPanel company={selected} />
      </main>
      <footer className="foot">
        mock 데이터 · 데이터 연결은 다음 단계 (React → Express → Supabase)
      </footer>
    </div>
  )
}
