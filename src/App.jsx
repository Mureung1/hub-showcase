import { useEffect, useState } from 'react'
import AnalysisDashboard from './components/AnalysisDashboard.jsx'
import ConfirmationModal from './components/ConfirmationModal.jsx'
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
import {
  deleteSectionItem,
  toggleCalendarEventSelected,
  toggleTaskCompleted,
  updateCalendarEventField,
  updateSectionItem,
} from './utils/analysisHandlers.js'
import { detectPrivacyPatterns } from './utils/privacyPatterns.js'
import {
  clearNoticePilotState,
  loadNoticePilotState,
  saveNoticePilotState,
} from './utils/storage.js'
import { validateAnalysisResult } from './utils/validateAnalysisResult.js'

const maxUploadSizeBytes = 1024 * 1024
const acceptedTextExtensions = ['.txt', '.md']

export default function App() {
  const [savedState] = useState(() => loadNoticePilotState() || {})
  const initialLanguage = savedState.language || 'en'
  const [language, setLanguage] = useState(initialLanguage)
  const [noticeTitle, setNoticeTitle] = useState(savedState.noticeTitle || '')
  const [extractedText, setExtractedText] = useState(
    savedState.extractedText || savedState.sourceText || '',
  )
  const [uploadedFileName, setUploadedFileName] = useState(
    savedState.uploadedFileName || '',
  )
  const [userSelectedNoticeType, setUserSelectedNoticeType] = useState(
    savedState.userSelectedNoticeType || '',
  )
  const [noticePublicationDate, setNoticePublicationDate] = useState(
    savedState.noticePublicationDate || '',
  )
  const [analysisResult, setAnalysisResult] = useState(() =>
    savedState.analysisResult
      ? validateAnalysisResult(
          savedState.analysisResult,
          localizedContent[initialLanguage].validationWarnings,
        )
      : null,
  )
  const [activeEvidence, setActiveEvidence] = useState(null)
  const [inputWarnings, setInputWarnings] = useState([])
  const [error, setError] = useState(null)
  const [confirmationType, setConfirmationType] = useState(null)
  const copy = localizedContent[language]

  useEffect(() => {
    saveNoticePilotState({
      language,
      noticeTitle,
      sourceText: extractedText,
      extractedText,
      uploadedFileName,
      userSelectedNoticeType,
      noticePublicationDate,
      analysisResult,
    })
  }, [
    language,
    noticeTitle,
    extractedText,
    uploadedFileName,
    userSelectedNoticeType,
    noticePublicationDate,
    analysisResult,
  ])

  function prepareAnalysisResult(rawResult, nextLanguage = language) {
    return validateAnalysisResult(
      {
        ...rawResult,
        userSelectedNoticeType: userSelectedNoticeType || 'unknown',
        noticePublicationDate,
        uploadedFileName,
        detectedNoticeType: rawResult.detectedNoticeType || '',
      },
      localizedContent[nextLanguage].validationWarnings,
    )
  }

  function setBlockingError(nextError) {
    setError(nextError)
  }

  function clearErrorType(type) {
    setError((currentError) => (currentError?.type === type ? null : currentError))
  }

  function executeMockAnalysis(nextLanguage = language) {
    const mockNotice = getMockNotice(nextLanguage)
    const mockResult = prepareAnalysisResult(
      createMockAnalysisResult(nextLanguage),
      nextLanguage,
    )

    setNoticeTitle((currentTitle) => currentTitle || mockNotice.noticeTitle)
    setExtractedText((currentText) => currentText || mockNotice.noticeText)
    setAnalysisResult(mockResult)
    setInputWarnings([])
    setError(null)
    setActiveEvidence({
      type: localizedContent[nextLanguage].collectionLabels.deadlines,
      item: mockResult.deadlines[0],
    })
  }

  function loadMockForLanguage(nextLanguage) {
    const mockNotice = getMockNotice(nextLanguage)
    const mockResult = prepareAnalysisResult(
      createMockAnalysisResult(nextLanguage),
      nextLanguage,
    )
    setNoticeTitle(mockNotice.noticeTitle)
    setExtractedText(mockNotice.noticeText)
    setUploadedFileName('')
    setAnalysisResult(mockResult)
    setInputWarnings([])
    setError(null)
    setActiveEvidence({
      type: localizedContent[nextLanguage].collectionLabels.deadlines,
      item: mockResult.deadlines[0],
    })
  }

  function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage)
    setInputWarnings([])
    setError(null)

    if (analysisResult) {
      loadMockForLanguage(nextLanguage)
      return
    }

    setActiveEvidence(null)
  }

  function requestMockAnalysis({ skipOverwrite = false, skipPrivacy = false } = {}) {
    if (analysisResult && !skipOverwrite) {
      setConfirmationType('overwrite')
      return
    }

    const privacyMatches = detectPrivacyPatterns(extractedText)

    if (privacyMatches.length && !skipPrivacy) {
      setInputWarnings([
        {
          type: 'privacy_patterns_detected',
          message: copy.warnings.privacyPatternsDetected(privacyMatches),
        },
      ])
      setConfirmationType('privacy')
      return
    }

    executeMockAnalysis()
  }

  function handleAnalyzeMockNotice() {
    requestMockAnalysis()
  }

  function handleConfirmAction() {
    const currentConfirmation = confirmationType
    setConfirmationType(null)

    if (currentConfirmation === 'overwrite') {
      requestMockAnalysis({ skipOverwrite: true })
      return
    }

    if (currentConfirmation === 'privacy') {
      executeMockAnalysis()
    }
  }

  function handleCancelConfirmation() {
    setConfirmationType(null)
  }

  function handleAnalysisMetadataChange(updates) {
    setAnalysisResult((currentResult) => {
      if (!currentResult) {
        return currentResult
      }

      return {
        ...currentResult,
        ...updates,
      }
    })
  }

  function handleClearNotice() {
    setNoticeTitle('')
    setExtractedText('')
    setUploadedFileName('')
    setUserSelectedNoticeType('')
    setNoticePublicationDate('')
    setAnalysisResult(null)
    setActiveEvidence(null)
    setInputWarnings([])
    setError(null)
    clearNoticePilotState()
  }

  function handleNoticeFileUpload(file) {
    if (!file) {
      return
    }

    const fileName = file.name
    const lowerFileName = fileName.toLowerCase()
    const hasAcceptedExtension = acceptedTextExtensions.some((extension) =>
      lowerFileName.endsWith(extension),
    )

    if (!hasAcceptedExtension) {
      setBlockingError({
        type: 'upload_error',
        title: copy.errors.fileErrorTitle,
        message: copy.errors.unsupportedFile,
        location: 'input',
      })
      return
    }

    if (file.size > maxUploadSizeBytes) {
      setBlockingError({
        type: 'upload_error',
        title: copy.errors.fileErrorTitle,
        message: copy.errors.fileTooLarge,
        location: 'input',
      })
      return
    }

    const reader = new FileReader()

    reader.onload = (event) => {
      setExtractedText(String(event.target.result || ''))
      setUploadedFileName(fileName)
      clearErrorType('upload_error')
    }

    reader.onerror = () => {
      setBlockingError({
        type: 'upload_error',
        title: copy.errors.fileErrorTitle,
        message: copy.errors.fileReadFailed,
        location: 'input',
      })
    }

    reader.readAsText(file)
  }

  function handleItemUpdate(collectionName, itemId, updates) {
    setAnalysisResult((currentResult) => {
      if (!currentResult) {
        return currentResult
      }

      if (collectionName === 'tasks' && 'completed' in updates) {
        return toggleTaskCompleted(currentResult, itemId, updates.completed)
      }

      if (collectionName === 'calendarEvents' && 'selected' in updates) {
        return toggleCalendarEventSelected(currentResult, itemId, updates.selected)
      }

      if (collectionName === 'calendarEvents') {
        return updateCalendarEventField(currentResult, itemId, updates)
      }

      return updateSectionItem(currentResult, collectionName, itemId, updates)
    })
  }

  function handleItemDelete(collectionName, itemId) {
    setAnalysisResult((currentResult) => {
      if (!currentResult) {
        return currentResult
      }

      return deleteSectionItem(currentResult, collectionName, itemId)
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
                extractedText={extractedText}
                uploadedFileName={uploadedFileName}
                userSelectedNoticeType={userSelectedNoticeType}
                noticePublicationDate={noticePublicationDate}
                warnings={inputWarnings}
                error={error}
                onTitleChange={setNoticeTitle}
                onExtractedTextChange={setExtractedText}
                onNoticeTypeChange={(value) => {
                  setUserSelectedNoticeType(value)
                  handleAnalysisMetadataChange({
                    userSelectedNoticeType: value || 'unknown',
                  })
                }}
                onPublicationDateChange={(value) => {
                  setNoticePublicationDate(value)
                  handleAnalysisMetadataChange({ noticePublicationDate: value })
                }}
                onFileUpload={handleNoticeFileUpload}
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
                error={error}
                onError={setBlockingError}
                onClearError={clearErrorType}
              />
            </aside>
          </div>
        </section>
      </main>

      {confirmationType ? (
        <ConfirmationModal
          title={copy.confirmations[confirmationType].title}
          message={copy.confirmations[confirmationType].message}
          confirmLabel={copy.confirmations[confirmationType].confirm}
          cancelLabel={copy.confirmations[confirmationType].cancel}
          onConfirm={handleConfirmAction}
          onCancel={handleCancelConfirmation}
        />
      ) : null}
    </div>
  )
}
