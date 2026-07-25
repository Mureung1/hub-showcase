import { useState } from 'react';
import { CampusDirectory } from '../screens/campus-directory/CampusDirectory';
import { Dashboard } from '../screens/campus-dashboard/Dashboard';
import { liveProvider } from '../shared/data/live-provider';
import styles from './App.module.css';

function App() {
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);

  const selectCampus = (campusId: string) => {
    setSelectedCampusId(campusId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showDirectory = () => {
    setSelectedCampusId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {selectedCampusId
          ? <Dashboard key={selectedCampusId} provider={liveProvider} initialCampusId={selectedCampusId} onBack={showDirectory} />
          : <CampusDirectory campuses={liveProvider.campuses} onSelect={selectCampus} />}
      </div>
    </div>
  );
}

export default App;
