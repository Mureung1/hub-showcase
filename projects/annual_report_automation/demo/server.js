// 연간결산 보고서 자동화 — 데모 서버
// Express + vanilla JS (빌드 스텝 없음)

import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { runPipeline, 요약 } from './src/engine/pipeline.js';
import { runScenarios, 분개영향, 결정변수 } from './src/engine/scenarios.js';
import { 통장내역, 자산대장, 회사, 기초잔액 } from './src/data/mock.js';
import { 분개규칙 } from './src/engine/stage1-journal.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3100;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

/** 원천자료 (0단계) */
app.get('/api/source', (req, res) => {
  res.json({ 회사, 통장내역, 자산대장, 기초잔액, 분개규칙: 분개규칙.map(({ id, 설명, 경로, 신뢰도 }) => ({ id, 설명, 경로, 신뢰도 })) });
});

/** 전체 파이프라인 (1~5단계) */
app.get('/api/pipeline', (req, res) => {
  const 큐답변 = req.query.q1 ? { Q1: req.query.q1 } : {};
  // 절세 시나리오 선택 — 비품(A03)의 상각방법·내용연수. 법정 강제 자산은 주입해도 무시된다.
  const 사용자선택 = req.query.방법
    ? { A03: { 방법: req.query.방법, 내용연수: Number(req.query.연수) || 5 } }
    : {};
  const r = runPipeline({ 큐답변, 사용자선택 });
  res.json({
    요약: 요약(r),
    stage1: r.stage1,
    stage2: {
      감가: r.stage2.감가, 선급: r.stage2.선급, 법인세: r.stage2.법인세,
      수정분개: r.stage2.수정분개, 시산표: r.stage2.시산표,
    },
    stage3: r.stage3,
    stage4: r.stage4,
    stage5: r.stage5,
    수렴: r.수렴,
  });
});

/** 절세 시나리오 (5단계 확장) */
app.get('/api/scenarios', (req, res) => res.json(runScenarios()));

/** 분개 판정 하나가 세금을 얼마나 가르는가 */
app.get('/api/impact', (req, res) => res.json(분개영향()));

/** 결정 변수 공간 */
app.get('/api/variables', (req, res) => res.json(결정변수()));

app.listen(PORT, () => {
  console.log(`\n  연간결산 보고서 자동화 — 파이프라인 데모`);
  console.log(`  http://localhost:${PORT}\n`);
});
