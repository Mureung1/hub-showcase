import { useState } from 'react';
import './App.css';
import { recommendedJobs } from './mockData';
import InfoInput from './screens/InfoInput';
import RecommendList from './screens/RecommendList';
import JobDetail from './screens/JobDetail';
import DraftEditor from './screens/DraftEditor';

function App() {
  const [step, setStep] = useState('input');
  const [selectedJob, setSelectedJob] = useState(null);

  function handleProfileSubmit() {
    setStep('list');
  }

  function handleSelectJob(job) {
    setSelectedJob(job);
    setStep('detail');
  }

  function handleGenerateDraft(job) {
    setSelectedJob(job);
    setStep('draft');
  }

  return (
    <main className="page">
      {step === 'input' && <InfoInput onSubmit={handleProfileSubmit} />}
      {step === 'list' && (
        <RecommendList
          jobs={recommendedJobs}
          onSelectJob={handleSelectJob}
          onBack={() => setStep('input')}
        />
      )}
      {step === 'detail' && (
        <JobDetail job={selectedJob} onBack={() => setStep('list')} onGenerateDraft={handleGenerateDraft} />
      )}
      {step === 'draft' && <DraftEditor job={selectedJob} onBack={() => setStep('list')} />}
    </main>
  );
}

export default App;
