import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Guide from './Guide';
import { loadShowcases } from './load-showcases';

const root = createRoot(document.getElementById('root')!);

if (window.location.pathname.endsWith('/guide/') || window.location.pathname.endsWith('/guide')) {
  root.render(
    <StrictMode>
      <Guide />
    </StrictMode>,
  );
} else {

root.render(<p className="load-state">프로젝트 자료를 불러오는 중입니다.</p>);

loadShowcases().then((projects) => root.render(
  <StrictMode>
    <App projects={projects} />
  </StrictMode>,
)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : '프로젝트 자료를 불러오지 못했습니다.';
  root.render(<p className="load-state error">{message}</p>);
});
}
