export const defaultKnowledgeChunkFileNames = ['docker-docs-chunks.jsonl', 'react_docs.jsonl']

export function loadKnowledgeChunks({ fs, path, repoRoot, fileNames = defaultKnowledgeChunkFileNames }) {
  const dataDir = path.join(repoRoot, 'data')

  return fileNames.flatMap((fileName) => {
    const topic = inferTopicFromFileName(fileName)
    const filePath = path.join(dataDir, fileName)

    if (!fs.existsSync(filePath)) return []

    return fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line, lineIndex) => parseKnowledgeChunk({ line, lineIndex, topic, fileName }))
      .filter(Boolean)
  })
}

export function searchKnowledgeChunks({ chunks, query, limit = 5 }) {
  const terms = tokenize(query)
  if (terms.length === 0) return []

  return chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, terms) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
    .slice(0, limit)
    .map((result) => result.chunk)
}

function parseKnowledgeChunk({ line, lineIndex, topic, fileName }) {
  const trimmed = line.trim()
  if (!trimmed) return null

  try {
    const value = JSON.parse(trimmed)
    const normalized = normalizeKnowledgeChunkInput(value)

    if (!normalized) {
      return null
    }

    return {
      id: `${fileName}:${lineIndex + 1}`,
      ...normalized,
      sourceType: 'official-doc',
      topic,
    }
  } catch {
    return null
  }
}

function normalizeKnowledgeChunkInput(value) {
  const docTitle = pickString(value.docTitle, value.title)
  const chunkText = pickString(value.chunkText, value.content)
  const url = pickString(value.url)

  if (!docTitle || !chunkText || !url) {
    return null
  }

  return {
    docTitle,
    sectionHeading: pickString(value.sectionHeading) ?? docTitle,
    chunkText,
    url,
    sourcePath: pickString(value.sourcePath) ?? url,
  }
}

function pickString(...values) {
  const value = values.find(isNonEmptyString)

  return typeof value === 'string' ? value.trim() : null
}

function scoreChunk(chunk, terms) {
  const haystack = `${chunk.topic} ${chunk.docTitle} ${chunk.sectionHeading} ${chunk.chunkText}`.toLowerCase()
  const baseScore = terms.reduce((score, term) => {
    if (chunk.topic.toLowerCase() === term) return score + 6
    if (chunk.docTitle.toLowerCase().includes(term)) return score + 4
    if (chunk.sectionHeading.toLowerCase().includes(term)) return score + 3
    if (haystack.includes(term)) return score + 1
    return score
  }, 0)

  return baseScore + scoreSourceQuality(chunk)
}

function scoreSourceQuality(chunk) {
  let score = 0
  const url = String(chunk.url ?? '').toLowerCase()
  const haystack = `${chunk.docTitle} ${chunk.sectionHeading} ${chunk.chunkText}`.toLowerCase()

  if (url.includes('/learn/')) score += 5
  if (haystack.includes('deprecated') || haystack.includes('legacy') || haystack.includes('레거시')) score -= 4

  return score
}

function tokenize(query) {
  return String(query ?? '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}.+-]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
}

function inferTopicFromFileName(fileName) {
  const normalized = fileName.toLowerCase()
  if (normalized.includes('docker')) return 'docker'
  if (normalized.includes('react')) return 'react'
  return normalized.replace(/\.(jsonl|json)$/u, '')
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}
