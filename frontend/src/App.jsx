import { useState } from 'react'
import AnalysisPage from './pages/AnalysisPage'
import ComparePage from './pages/ComparePage'
import HomePage from './pages/HomePage'
import ListingUploadPage from './pages/ListingUploadPage'
import UserInfoPage from './pages/UserInfoPage'
import { hasDifferentUserInfo, loadCurrentUserInfo } from './utils/compareUtils'
import {
  deleteSavedAnalysis,
  findSavedAnalysis,
  loadSavedAnalyses,
  saveAnalysisResult,
} from './utils/savedAnalysisStorage'
import './App.css'

function App() {
  const [savedItems, setSavedItems] = useState(() => loadSavedAnalyses())
  const [currentPage, setCurrentPage] = useState(() => (savedItems.length ? 'home' : 'user-info'))
  const [analysisRequest, setAnalysisRequest] = useState(null)
  const [selectedSavedId, setSelectedSavedId] = useState('')
  const [isCompareMode, setIsCompareMode] = useState(false)
  const [compareSelectedIds, setCompareSelectedIds] = useState([])
  const [compareSavedIds, setCompareSavedIds] = useState([])
  const [compareUsesCurrentUserInfo, setCompareUsesCurrentUserInfo] = useState(false)
  const [compareHasUserInfoMismatch, setCompareHasUserInfoMismatch] = useState(false)

  function goToAnalysis(nextAnalysisRequest) {
    setAnalysisRequest(nextAnalysisRequest)
    setCurrentPage('analysis')
  }

  function goToUpload() {
    setIsCompareMode(false)
    setCurrentPage('upload')
  }

  function goToHome() {
    setSavedItems(loadSavedAnalyses())
    setIsCompareMode(false)
    setCompareSelectedIds([])
    setCurrentPage('home')
  }

  function goToUserInfo() {
    setIsCompareMode(false)
    setCurrentPage('user-info')
  }

  function saveCurrentAnalysis(savePayload) {
    const savedItem = saveAnalysisResult(savePayload)
    setSavedItems(loadSavedAnalyses())
    setSelectedSavedId(savedItem.id)
    setCurrentPage('home')
  }

  function openSavedAnalysis(id) {
    setSelectedSavedId(id)
    setCurrentPage('saved-detail')
  }

  function deleteSavedAnalysisItem(id) {
    const shouldDelete = window.confirm('저장한 매물 분석 결과를 삭제할까요? 삭제한 내용은 되돌릴 수 없습니다.')
    if (!shouldDelete) {
      return
    }

    try {
      const nextItems = deleteSavedAnalysis(id)
      setSavedItems(nextItems)
      setCompareSelectedIds((prevIds) => prevIds.filter((selectedId) => selectedId !== id))
      if (selectedSavedId === id) {
        setSelectedSavedId('')
      }
    } catch (error) {
      window.alert(error.message || '저장 매물을 삭제하지 못했습니다.')
    }
  }

  function handleCompare() {
    if (savedItems.length < 2) {
      return
    }

    setIsCompareMode(true)
    setCompareSelectedIds([])
  }

  function cancelCompareSelection() {
    setIsCompareMode(false)
    setCompareSelectedIds([])
  }

  function toggleCompareSelection(id) {
    setCompareSelectedIds((prevIds) => {
      if (prevIds.includes(id)) {
        return prevIds.filter((selectedId) => selectedId !== id)
      }

      if (prevIds.length >= 2) {
        return prevIds
      }

      return [...prevIds, id]
    })
  }

  function confirmCompareSelection() {
    if (compareSelectedIds.length !== 2) {
      return
    }

    const selectedItems = compareSelectedIds
      .map((id) => savedItems.find((item) => item.id === id))
      .filter(Boolean)

    if (selectedItems.length !== 2) {
      window.alert('비교할 매물을 다시 선택해주세요.')
      return
    }

    const hasUserInfoMismatch = hasDifferentUserInfo(selectedItems, loadCurrentUserInfo())
    const shouldUseCurrentUserInfo = hasUserInfoMismatch
      ? window.confirm('현재 사용자 정보와 저장 당시 기준이 다릅니다. 현재 사용자 정보 기준으로 다시 분석해 비교할까요?')
      : false

    setCompareSavedIds(compareSelectedIds)
    setCompareUsesCurrentUserInfo(shouldUseCurrentUserInfo)
    setCompareHasUserInfoMismatch(hasUserInfoMismatch)
    setIsCompareMode(false)
    setCurrentPage('compare')
  }

  if (currentPage === 'home') {
    return (
      <HomePage
        compareSelectedIds={compareSelectedIds}
        isCompareMode={isCompareMode}
        onAddListing={goToUpload}
        onCancelCompare={cancelCompareSelection}
        onCompare={handleCompare}
        onConfirmCompare={confirmCompareSelection}
        onDeleteSavedAnalysis={deleteSavedAnalysisItem}
        onEditUserInfo={goToUserInfo}
        onOpenSavedAnalysis={openSavedAnalysis}
        onToggleCompareSelection={toggleCompareSelection}
        savedItems={savedItems}
      />
    )
  }

  if (currentPage === 'compare') {
    const selectedItems = compareSavedIds
      .map((id) => savedItems.find((item) => item.id === id) || findSavedAnalysis(id))
      .filter(Boolean)

    return (
      <ComparePage
        hasUserInfoMismatch={compareHasUserInfoMismatch}
        onBackToHome={goToHome}
        savedItems={selectedItems}
        useCurrentUserInfo={compareUsesCurrentUserInfo}
      />
    )
  }

  if (currentPage === 'saved-detail') {
    const savedItem = savedItems.find((item) => item.id === selectedSavedId) || findSavedAnalysis(selectedSavedId)
    if (!savedItem) {
      return (
        <HomePage
          compareSelectedIds={compareSelectedIds}
          isCompareMode={isCompareMode}
          onAddListing={goToUpload}
          onCancelCompare={cancelCompareSelection}
          onCompare={handleCompare}
          onConfirmCompare={confirmCompareSelection}
          onDeleteSavedAnalysis={deleteSavedAnalysisItem}
          onEditUserInfo={goToUserInfo}
          onOpenSavedAnalysis={openSavedAnalysis}
          onToggleCompareSelection={toggleCompareSelection}
          savedItems={savedItems}
        />
      )
    }

    return (
      <AnalysisPage
        analysisRequest={savedItem.analysisRequest}
        initialAnalysis={savedItem.analysis}
        initialSelectedRouteMode={savedItem.selectedRouteMode}
        initialSelectedRouteKey={savedItem.selectedRouteKey}
        isSavedDetail
        onBackToHome={goToHome}
        onBackToUpload={goToUpload}
      />
    )
  }

  if (currentPage === 'analysis') {
    return (
      <AnalysisPage
        analysisRequest={analysisRequest}
        onBackToUpload={goToUpload}
        onSaveAnalysis={saveCurrentAnalysis}
      />
    )
  }

  if (currentPage === 'upload') {
    return <ListingUploadPage onAnalyze={goToAnalysis} onBack={() => setCurrentPage('user-info')} />
  }

  return <UserInfoPage onComplete={() => setCurrentPage('upload')} />
}

export default App
