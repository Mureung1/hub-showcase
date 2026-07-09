import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT_DIR = process.cwd()
const INDEX_PATH = 'test-corpus/index/notice_index.tsv'
const REQUIRED_COLUMNS = [
  'id',
  'institution',
  'notice_type',
  'source_title',
  'source_url',
  'published_at',
  'file_type',
  'raw_file_path',
  'extracted_text_path',
  'expected_result_path',
  'has_attachment',
  'has_deadline',
  'has_relative_date',
  'has_vague_date',
  'contains_personal_info',
  'copyright_risk',
  'notes',
]
const REQUIRED_EXPECTED_SECTIONS = [
  'deadlines',
  'tasks',
  'submissions',
  'requirements',
  'cautions',
  'calendarEvents',
]
const ALLOWED_NOTICE_TYPES = new Set([
  'school_notice',
  'scholarship',
  'assignment',
  'competition',
  'job_posting',
  'ambiguous_date',
])

const errors = []

function reportError(message) {
  errors.push(message)
}

function resolveRepoPath(relativePath) {
  return path.resolve(ROOT_DIR, relativePath)
}

function isInsideRepo(relativePath) {
  const absolutePath = resolveRepoPath(relativePath)
  const relativeToRoot = path.relative(ROOT_DIR, absolutePath)

  return relativeToRoot && !relativeToRoot.startsWith('..') && !path.isAbsolute(relativeToRoot)
}

function fileExists(relativePath) {
  return fs.existsSync(resolveRepoPath(relativePath))
}

function readText(relativePath) {
  return fs.readFileSync(resolveRepoPath(relativePath), 'utf8')
}

function validateReferencedPath(row, fieldName, rowNumber, { required = true } = {}) {
  const value = row[fieldName]

  if (!value) {
    if (required) {
      reportError(`Row ${rowNumber}: ${fieldName} is required.`)
    }

    return
  }

  if (!isInsideRepo(value)) {
    reportError(`Row ${rowNumber}: ${fieldName} must stay inside the repository: ${value}`)
    return
  }

  if (!fileExists(value)) {
    reportError(`Row ${rowNumber}: ${fieldName} file does not exist: ${value}`)
  }
}

function validateExpectedResult(row, rowNumber) {
  const expectedPath = row.expected_result_path

  if (!expectedPath || !fileExists(expectedPath)) {
    return
  }

  let parsed

  try {
    parsed = JSON.parse(readText(expectedPath))
  } catch (error) {
    reportError(`Row ${rowNumber}: expected_result_path is not valid JSON: ${error.message}`)
    return
  }

  if (!parsed.expected || typeof parsed.expected !== 'object' || Array.isArray(parsed.expected)) {
    reportError(`Row ${rowNumber}: expected_result_path must include an expected object.`)
    return
  }

  for (const section of REQUIRED_EXPECTED_SECTIONS) {
    if (!Array.isArray(parsed.expected[section])) {
      reportError(`Row ${rowNumber}: expected.${section} must be an array.`)
    }
  }
}

if (!fileExists(INDEX_PATH)) {
  reportError(`${INDEX_PATH} does not exist.`)
} else {
  const lines = readText(INDEX_PATH)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line, index, allLines) => line.length > 0 || index < allLines.length - 1)

  const headerLine = lines[0] ?? ''
  const columns = headerLine.split('\t')

  if (columns.join('\t') !== REQUIRED_COLUMNS.join('\t')) {
    reportError(`${INDEX_PATH} header does not match required columns.`)
  }

  const rows = lines.slice(1).filter((line) => line.trim().length > 0)

  rows.forEach((line, index) => {
    const rowNumber = index + 2
    const values = line.split('\t')

    if (values.length !== REQUIRED_COLUMNS.length) {
      reportError(
        `Row ${rowNumber}: expected ${REQUIRED_COLUMNS.length} tab-separated fields, got ${values.length}.`,
      )
      return
    }

    const row = Object.fromEntries(REQUIRED_COLUMNS.map((column, columnIndex) => [column, values[columnIndex]]))

    if (!row.id) {
      reportError(`Row ${rowNumber}: id is required.`)
    }

    if (!ALLOWED_NOTICE_TYPES.has(row.notice_type)) {
      reportError(`Row ${rowNumber}: unsupported notice_type: ${row.notice_type}`)
    }

    validateReferencedPath(row, 'extracted_text_path', rowNumber)
    validateReferencedPath(row, 'expected_result_path', rowNumber)
    validateReferencedPath(row, 'raw_file_path', rowNumber, { required: false })
    validateExpectedResult(row, rowNumber)
  })

  if (errors.length === 0) {
    console.log(`Test corpus validation passed. Indexed entries: ${rows.length}`)
  }
}

if (errors.length > 0) {
  console.error('Test corpus validation failed:')

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  process.exit(1)
}
