// scripts/validate-knowledge-chunks.mjs
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export function validateKnowledgeChunkLines(lines) {
  const errors = []

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return

    let value
    try {
      value = JSON.parse(trimmed)
    } catch {
      errors.push({ line: index + 1, message: 'Invalid JSON' })
      return
    }

    const docTitle = value.docTitle ?? value.title
    const chunkText = value.chunkText ?? value.content
    const url = value.url

    if (typeof docTitle !== 'string' || docTitle.trim().length === 0) {
      errors.push({ line: index + 1, message: 'Missing docTitle/title' })
    }

    if (typeof chunkText !== 'string' || chunkText.trim().length === 0) {
      errors.push({ line: index + 1, message: 'Missing chunkText/content' })
    } else if (chunkText.length < 20) {
      errors.push({ line: index + 1, message: 'chunkText is too short (min 20 chars)' })
    } else if (chunkText.length > 2000) {
      errors.push({ line: index + 1, message: 'chunkText is too long (max 2000 chars)' })
    }

    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
      errors.push({ line: index + 1, message: 'Missing or invalid url (must start with http)' })
    }
  })

  return errors
}

export function validateKnowledgeChunkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  return validateKnowledgeChunkLines(content.split(/\r?\n/))
}

function main() {
  const targetPath = process.argv[2]
  if (!targetPath) {
    console.error('Usage: node scripts/validate-knowledge-chunks.mjs <path-to-jsonl>')
    process.exit(1)
  }

  const resolvedPath = path.resolve(targetPath)
  const errors = validateKnowledgeChunkFile(resolvedPath)

  if (errors.length === 0) {
    console.log(`OK: ${targetPath} has no schema errors.`)
    return
  }

  console.error(`Found ${errors.length} issue(s) in ${targetPath}:`)
  for (const error of errors) {
    console.error(`  line ${error.line}: ${error.message}`)
  }
  process.exit(1)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
