import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/tokens.css';
import App from './App.tsx';
import { ScheduleProvider } from './context/ScheduleContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {/* #24 — Routes(App 안)보다 바깥에 둬야 주소가 바뀌어도 값이 남는다 */}
      <ScheduleProvider>
        <App />
      </ScheduleProvider>
    </BrowserRouter>
  </StrictMode>,
);
