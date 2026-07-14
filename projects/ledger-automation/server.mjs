// @ts-check
// 정적 서빙 + 전표 REST API + Excel 결산보고서 내보내기.
import express from 'express';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ACCOUNTS } from './src/accounts.mjs';
import { ValidationError, addEntry, loadEntries, removeEntry } from './src/store.mjs';
import { buildReportBuffer } from './src/excel.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));

// 테스트에서 listen 없이 앱만 만들어 쓸 수 있도록 생성 함수를 분리한다.
export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(root, 'public')));

  app.get('/api/accounts', (_req, res) => {
    res.json(ACCOUNTS);
  });

  app.get('/api/entries', async (_req, res, next) => {
    try {
      res.json(await loadEntries());
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/entries', async (req, res, next) => {
    try {
      res.status(201).json(await addEntry(req.body));
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).json({ errors: err.errors });
        return;
      }
      next(err);
    }
  });

  app.delete('/api/entries/:id', async (req, res, next) => {
    try {
      if (await removeEntry(req.params.id)) res.status(204).end();
      else res.status(404).json({ errors: ['해당 id의 전표가 없습니다'] });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/export.xlsx', async (_req, res, next) => {
    try {
      const entries = await loadEntries();
      const buffer = await buildReportBuffer(entries);
      // 전표는 날짜순 정렬 저장이므로 첫 건의 연도 = 회계연도. 전표가 없으면 올해로.
      const year = entries.length > 0 ? entries[0].date.slice(0, 4) : String(new Date().getFullYear());
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      // 한글 파일명은 filename*=UTF-8'' 인코딩으로 보내고, 구형 클라이언트용 ASCII 폴백을 함께 둔다.
      res.setHeader('Content-Disposition', `attachment; filename="report.xlsx"; filename*=UTF-8''${encodeURIComponent(`결산보고서_${year}.xlsx`)}`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  });

  return app;
}

// node server.mjs로 직접 실행했을 때만 listen — 테스트가 import할 때는 실행되지 않는다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => {
    console.log(`ledger-automation 서버 실행 중: http://localhost:${port}`);
  });
}
