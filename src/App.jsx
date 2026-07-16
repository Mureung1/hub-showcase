import { useState } from 'react';
import './App.css';
import { submitProfile } from './api';
import InfoInput from './screens/InfoInput';
import RecommendList from './screens/RecommendList';
import JobDetail from './screens/JobDetail';
import DraftEditor from './screens/DraftEditor';

function App() {
  const [step, setStep] = useState('input');
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  async function handleProfileSubmit(profile) {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const { recommendations } = await submitProfile(profile);
      setJobs(recommendations);
      setStep('list');
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
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
      {step === 'input' && (
        <InfoInput onSubmit={handleProfileSubmit} isSubmitting={isSubmitting} submitError={submitError} />
      )}
      {step === 'list' && (
        <RecommendList jobs={jobs} onSelectJob={handleSelectJob} onBack={() => setStep('input')} />
      )}
      {step === 'detail' && (
        <JobDetail job={selectedJob} onBack={() => setStep('list')} onGenerateDraft={handleGenerateDraft} />
      )}
      {step === 'draft' && <DraftEditor job={selectedJob} onBack={() => setStep('list')} />}
    </main>
  );
}

export default App;
