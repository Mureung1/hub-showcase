import { useState } from 'react'
import AnalysisPage from './pages/AnalysisPage'
import ListingUploadPage from './pages/ListingUploadPage'
import UserInfoPage from './pages/UserInfoPage'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('user-info')
  const [analysisRequest, setAnalysisRequest] = useState(null)

  function goToAnalysis(nextAnalysisRequest) {
    setAnalysisRequest(nextAnalysisRequest)
    setCurrentPage('analysis')
  }

  function goToUpload() {
    setCurrentPage('upload')
  }

  if (currentPage === 'analysis') {
    return <AnalysisPage analysisRequest={analysisRequest} onBackToUpload={goToUpload} />
  }

  if (currentPage === 'upload') {
    return <ListingUploadPage onAnalyze={goToAnalysis} onBack={() => setCurrentPage('user-info')} />
  }

  return <UserInfoPage onComplete={() => setCurrentPage('upload')} />
}

export default App
