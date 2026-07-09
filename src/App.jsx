import { useState } from 'react';
import PitchPage from './components/PitchPage.jsx';
import PortfolioBuilder from './components/PortfolioBuilder.jsx';

export default function App() {
  const [view, setView] = useState('pitch'); // 'pitch' | 'builder'

  if (view === 'builder') {
    return <PortfolioBuilder onBack={() => setView('pitch')} />;
  }

  return <PitchPage onStart={() => setView('builder')} />;
}
