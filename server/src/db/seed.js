import 'dotenv/config'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    job_id INTEGER PRIMARY KEY,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    posted_at TEXT,
    deadline TEXT,
    status TEXT,
    job_category TEXT,
    is_intern INTEGER NOT NULL DEFAULT 0,
    education TEXT,
    career_min_months INTEGER,
    career_max_months INTEGER,
    certificates TEXT,
    major TEXT,
    foreign_lang_test TEXT,
    foreign_lang_score INTEGER,
    computer_skill TEXT
  )
`)

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

const rows = parseCsv(readFileSync(CSV_PATH, 'utf-8'))
seedAll(rows)

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
