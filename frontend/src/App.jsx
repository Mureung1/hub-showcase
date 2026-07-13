import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Setup from './pages/Setup';

function App() {
  const [currentView, setCurrentView] = useState('setup');

  return (
    <div className="min-h-screen flex bg-[#F4F7FE] text-[#151D48]">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      <main className="flex-1 p-8">
        <div className="max-w-[1600px] mx-auto">
          {currentView === 'setup' && <Setup />}
        </div>
      </main>
    </div>
  );
}

export default App;
