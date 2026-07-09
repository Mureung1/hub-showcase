import { Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/Home/HomePage';
import { InputPage } from './pages/Input/InputPage';
import { ProcessingPage } from './pages/Processing/ProcessingPage';
import { ResultPage } from './pages/Result/ResultPage';
import { AdjustPage } from './pages/Adjust/AdjustPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/input" element={<InputPage />} />
      <Route path="/processing" element={<ProcessingPage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/adjust" element={<AdjustPage />} />
    </Routes>
  );
}

export default App;
