import { generateMarkdown } from '../utils/generateMarkdown.js'

function downloadTextFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export default function ExportPanel({ copy, markdownCopy, analysisResult }) {
  function handleMarkdownDownload() {
    downloadTextFile(
      copy.fileName,
      generateMarkdown(analysisResult, markdownCopy),
      'text/markdown;charset=utf-8',
    )
  }

  return (
    <section className="side-panel">
      <div className="section-heading compact">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
      </div>
      <div className="export-actions">
        <button
          type="button"
          className="primary-button"
          onClick={handleMarkdownDownload}
          disabled={!analysisResult}
        >
          {copy.markdownButton}
        </button>
        <button type="button" className="ghost-button" disabled>
          {copy.icsButton}
        </button>
      </div>
      <p className="muted">{copy.note}</p>
    </section>
  )
}
