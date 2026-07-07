import { useState } from 'react'
import ErrorMessage from './ErrorMessage.jsx'
import { generateMarkdown } from '../utils/generateMarkdown.js'
import { generateIcs, getExportableCalendarEvents } from '../utils/generateIcs.js'

function downloadTextFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export default function ExportPanel({
  copy,
  markdownCopy,
  analysisResult,
  error,
  onError,
  onClearError,
}) {
  const [includeEvidence, setIncludeEvidence] = useState(false)

  function handleMarkdownDownload() {
    downloadTextFile(
      copy.fileName,
      generateMarkdown(analysisResult, markdownCopy, { includeEvidence }),
      'text/markdown;charset=utf-8',
    )
  }

  function handleIcsDownload() {
    if (!getExportableCalendarEvents(analysisResult).length) {
      onError({
        type: 'export_error',
        title: copy.exportErrorTitle,
        message: copy.noValidEvents,
        location: 'export',
      })
      return
    }

    onClearError('export_error')
    downloadTextFile(
      copy.icsFileName,
      generateIcs(analysisResult),
      'text/calendar;charset=utf-8',
    )
  }

  return (
    <section className="side-panel">
      <div className="section-heading compact">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
      </div>
      <label className="inline-check">
        <input
          type="checkbox"
          checked={includeEvidence}
          onChange={(event) => setIncludeEvidence(event.target.checked)}
          disabled={!analysisResult}
        />
        <span>{copy.includeEvidence}</span>
      </label>
      <div className="export-actions">
        <button
          type="button"
          className="primary-button"
          onClick={handleMarkdownDownload}
          disabled={!analysisResult}
        >
          {copy.markdownButton}
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={handleIcsDownload}
          disabled={!analysisResult}
        >
          {copy.icsButton}
        </button>
      </div>
      <ErrorMessage error={error?.location === 'export' ? error : null} />
      <p className="muted">{copy.note}</p>
    </section>
  )
}
