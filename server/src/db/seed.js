import 'dotenv/config'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { db } from './connection.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CSV_PATH = path.resolve(__dirname, '../../data/jobs_data.csv')

// jobs_data.csv wraps fields containing commas in quotes (e.g. certificates: "간호사,물리치료사") — needs real CSV parsing, not a plain split(',').
function parseCsvLine(line) {
  const fields = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      fields.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  fields.push(cur)
  return fields
}

function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((line) => line.length > 0)
  const header = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(header.map((key, i) => [key, values[i]]))
  })
}

function toIntOrNull(value) {
  return value === '' ? null : Number.parseInt(value, 10)
}

function toTextOrNull(value) {
  return value === '' ? null : value
}

// jobs 테이블 자체는 db/connection.js가 항상 먼저 생성해둔다 (server 시작 시 자동 시드가
// COUNT 쿼리를 하려면 이 함수가 import되는 시점에 테이블이 이미 있어야 하기 때문).
const insert = db.prepare(`
  INSERT INTO jobs (
    job_id, company, title, posted_at, deadline, status, job_category, is_intern,
    education, career_min_months, career_max_months, certificates, major,
    foreign_lang_test, foreign_lang_score, computer_skill
  ) VALUES (
    @job_id, @company, @title, @posted_at, @deadline, @status, @job_category, @is_intern,
    @education, @career_min_months, @career_max_months, @certificates, @major,
    @foreign_lang_test, @foreign_lang_score, @computer_skill
  )
  ON CONFLICT(job_id) DO UPDATE SET
    company = excluded.company,
    title = excluded.title,
    posted_at = excluded.posted_at,
    deadline = excluded.deadline,
    status = excluded.status,
    job_category = excluded.job_category,
    is_intern = excluded.is_intern,
    education = excluded.education,
    career_min_months = excluded.career_min_months,
    career_max_months = excluded.career_max_months,
    certificates = excluded.certificates,
    major = excluded.major,
    foreign_lang_test = excluded.foreign_lang_test,
    foreign_lang_score = excluded.foreign_lang_score,
    computer_skill = excluded.computer_skill
`)

const seedAll = db.transaction((records) => {
  for (const record of records) {
    insert.run({
      job_id: Number.parseInt(record.job_id, 10),
      company: record.company,
      title: record.title,
      posted_at: record.posted_at,
      deadline: record.deadline,
      status: record.status,
      job_category: record.job_category,
      is_intern: record.is_intern === 'True' ? 1 : 0,
      education: record.education,
      career_min_months: toIntOrNull(record.career_min_months),
      career_max_months: toIntOrNull(record.career_max_months),
      certificates: toTextOrNull(record.certificates),
      major: record.major,
      foreign_lang_test: toTextOrNull(record.foreign_lang_test),
      foreign_lang_score: toIntOrNull(record.foreign_lang_score),
      computer_skill: record.computer_skill,
    })
  }
})

function loadCsvRows() {
  return parseCsv(readFileSync(CSV_PATH, 'utf-8'))
}

// 서버 시작 시(index.js) 호출한다 — jobs 테이블이 비어있을 때만 CSV를 읽어 시드하고,
// 이미 데이터가 있으면 아무것도 하지 않는다(재배포로 파일시스템이 초기화되는 경우의 안전장치).
// 공유 db 커넥션을 계속 써야 하므로 close()는 절대 하지 않는다 — 그건 아래 수동 스크립트 전용.
export function seedJobsIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM jobs').get()
  if (count > 0) return { seeded: false, total: count }
  const rows = loadCsvRows()
  seedAll(rows)
  return { seeded: true, total: rows.length }
}

function runManualSeed() {
  seedAll(loadCsvRows())

  // 완료 기준 (docs/checklist_2.md): 862건 적재 + 직종 9그룹 + 학력 6종 (+ 개발_Task.md: 인턴 90건) 분포가 원본 CSV와 일치
  const total = db.prepare('SELECT COUNT(*) AS count FROM jobs').get().count
  const categoryCount = db.prepare('SELECT COUNT(DISTINCT job_category) AS count FROM jobs').get().count
  const educationCount = db.prepare('SELECT COUNT(DISTINCT education) AS count FROM jobs').get().count
  const internCount = db.prepare('SELECT COUNT(*) AS count FROM jobs WHERE is_intern = 1').get().count

  console.log(`시드 완료: jobs ${total}건`)
  console.log(`직종(job_category) 그룹 수: ${categoryCount}`)
  console.log(`학력(education) 종류 수: ${educationCount}`)
  console.log(`인턴(is_intern=1) 건수: ${internCount}`)

  if (total !== 862 || categoryCount !== 9 || educationCount !== 6 || internCount !== 90) {
    console.warn('경고: 예상 검증 수치(862건/9그룹/6종/90건)와 다릅니다 — jobs_data.csv가 바뀌었는지 확인하세요.')
  }

  db.close()
}

// `node src/db/seed.js`로 직접 실행했을 때만 항상 재시드(+진단 로그+db.close)한다.
// 다른 모듈이 seedJobsIfEmpty를 쓰려고 이 파일을 import하기만 할 때는 이 블록이 실행되지 않는다.
const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMainModule) {
  runManualSeed()
}
