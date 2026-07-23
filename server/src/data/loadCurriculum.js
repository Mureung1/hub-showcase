// server/src/data/loadCurriculum.js
// raw/ 아래 학사 데이터 CSV들을 읽어 normalizeCourse로 변환한 과목 배열을 만든다.
// 실제 파일 I/O를 담당하는 부분이라 normalizeCourse(순수 함수)와 분리해뒀다.
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { normalizeCourse, getBaseCode } = require('./normalizeCourse');
const categoryOverrides = require('./categoryOverrides');

const DEFAULT_CSV_PATHS = [
  path.join(__dirname, 'raw', '2026-2_curriculum_cse.csv'),
  path.join(__dirname, 'raw', 'GeneralCourses_gws.csv'),
];

// 원본 CSV마다 헤더 표기가 달라서(예: '강좌 번호' vs '강좌\n번호') 공백을 전부
// 제거해 키를 통일한다. 값 자체(시간 등)의 줄바꿈은 normalizeCourse에서 처리한다.
function normalizeHeaderKeys(row) {
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    result[key.replace(/\s+/g, '')] = value;
  }
  return result;
}

function readRows(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    bom: true, // 원본 파일 맨 앞의 BOM(﻿) 제거
  });
  return rows.map(normalizeHeaderKeys);
}

function loadCurriculum(csvPaths = DEFAULT_CSV_PATHS) {
  const rows = csvPaths.flatMap(readRows);

  // 분반 번호를 뗀 baseCode 단위로 행을 묶어 과목당 하나씩만 남긴다.
  const groups = new Map();
  for (const row of rows) {
    const baseCode = getBaseCode(row['강좌번호']);
    if (!groups.has(baseCode)) groups.set(baseCode, []);
    groups.get(baseCode).push(row);
  }

  return Array.from(groups.values()).map((groupRows) =>
    normalizeCourse(groupRows, categoryOverrides)
  );
}

module.exports = { loadCurriculum };
