import { useState } from 'react'
import AnalysisDashboard from './components/AnalysisDashboard.jsx'
import EmptyState from './components/EmptyState.jsx'
import ExportPanel from './components/ExportPanel.jsx'
import Header from './components/Header.jsx'
import NoticeInput from './components/NoticeInput.jsx'
import SourceEvidencePanel from './components/SourceEvidencePanel.jsx'
import DemoExampleSection from './components/intro/DemoExampleSection.jsx'
import FeatureSection from './components/intro/FeatureSection.jsx'
import FinalProductStatement from './components/intro/FinalProductStatement.jsx'
import MvpScopeSection from './components/intro/MvpScopeSection.jsx'
import ProblemSection from './components/intro/ProblemSection.jsx'
import ProjectOverview from './components/intro/ProjectOverview.jsx'
import SolutionSection from './components/intro/SolutionSection.jsx'
import TechStackSection from './components/intro/TechStackSection.jsx'
import UserScenarioSection from './components/intro/UserScenarioSection.jsx'
import {
  createMockAnalysisResult,
  getMockNotice,
} from './data/mockAnalysisResult.js'
import { localizedContent } from './data/localizedContent.js'

function updateItemInCollection(items, itemId, updates) {
  return items.map((item) =>
    item.id === itemId ? { ...item, ...updates } : item,
  )
}

function deleteItemFromCollection(items, itemId) {
  return items.filter((item) => item.id !== itemId)
}

export default function App() {
  const [language, setLanguage] = useState('en')
  const [noticeTitle, setNoticeTitle] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [analysisResult, setAnalysisResult] = useState(null)
  const [activeEvidence, setActiveEvidence] = useState(null)
  const copy = localizedContent[language]

  function loadMockForLanguage(nextLanguage) {
    const mockNotice = getMockNotice(nextLanguage)
    const mockResult = createMockAnalysisResult(nextLanguage)
    setNoticeTitle(mockNotice.noticeTitle)
    setSourceText(mockNotice.noticeText)
    setAnalysisResult(mockResult)
    setActiveEvidence({
      type: localizedContent[nextLanguage].collectionLabels.deadlines,
      item: mockResult.deadlines[0],
    })
  }

  function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage)

    if (analysisResult) {
      loadMockForLanguage(nextLanguage)
      return
    }

    setActiveEvidence(null)
  }

  function handleAnalyzeMockNotice() {
    const mockNotice = getMockNotice(language)
    setNoticeTitle((currentTitle) => currentTitle || mockNotice.noticeTitle)
    setSourceText((currentText) => currentText || mockNotice.noticeText)
    const mockResult = createMockAnalysisResult(language)
    setAnalysisResult(mockResult)
    setActiveEvidence({
      type: copy.collectionLabels.deadlines,
      item: mockResult.deadlines[0],
    })
  }

  function handleClearNotice() {
    setNoticeTitle('')
    setSourceText('')
    setAnalysisResult(null)
    setActiveEvidence(null)
  }

  function handleItemUpdate(collectionName, itemId, updates) {
    setAnalysisResult((currentResult) => {
      if (!currentResult) {
        return currentResult
      }

      return {
        ...currentResult,
        [collectionName]: updateItemInCollection(
          currentResult[collectionName],
          itemId,
          updates,
        ),
      }
    })
  }

  function handleItemDelete(collectionName, itemId) {
    setAnalysisResult((currentResult) => {
      if (!currentResult) {
        return currentResult
      }

      return {
        ...currentResult,
        [collectionName]: deleteItemFromCollection(
          currentResult[collectionName],
          itemId,
        ),
      }
    })

    setActiveEvidence((currentEvidence) =>
      currentEvidence?.item.id === itemId ? null : currentEvidence,
    )
  }

  function handleShowEvidence(collectionName, item) {
    setActiveEvidence({
      type: copy.collectionLabels[collectionName],
      item,
    })
  }

  return (
    <div className="app-shell">
      <Header
        copy={copy.header}
        language={language}
        languages={localizedContent}
        onLanguageChange={handleLanguageChange}
      />

      <main>
        <section className="section-band intro-band">
          <div className="content-stack">
            <ProjectOverview content={copy.intro.overview} />
            <div className="intro-grid">
              <ProblemSection content={copy.intro.problem} />
              <SolutionSection content={copy.intro.solution} />
            </div>
            <UserScenarioSection content={copy.intro.useCases} />
            <FeatureSection content={copy.intro.features} />
            <MvpScopeSection content={copy.intro.scope} />
            <TechStackSection content={copy.intro.techStack} />
            <DemoExampleSection content={copy.intro.demo} />
            <FinalProductStatement content={copy.intro.finalStatement} />
          </div>
        </section>

        <section className="section-band workspace-band" id="workspace">
          <div className="workspace-layout">
            <div className="workspace-main">
              <NoticeInput
                copy={copy.noticeInput}
                noticeTitle={noticeTitle}
                sourceText={sourceText}
                onTitleChange={setNoticeTitle}
                onSourceTextChange={setSourceText}
                onAnalyzeMock={handleAnalyzeMockNotice}
                onClear={handleClearNotice}
              />

              {analysisResult ? (
                <AnalysisDashboard
                  analysisResult={analysisResult}
                  copy={copy.dashboard}
                  cardCopy={copy.card}
                  collectionLabels={copy.collectionLabels}
                  onItemUpdate={handleItemUpdate}
                  onItemDelete={handleItemDelete}
                  onShowEvidence={handleShowEvidence}
                />
              ) : (
                <EmptyState copy={copy.emptyState} />
              )}
            </div>

            <aside className="workspace-sidebar">
              <SourceEvidencePanel
                copy={copy.evidencePanel}
                evidence={activeEvidence}
              />
              <ExportPanel
                copy={copy.exportPanel}
                markdownCopy={copy.markdown}
                analysisResult={analysisResult}
              />
            </aside>
          </div>
        </section>
      </main>
    </div>
  )
}
