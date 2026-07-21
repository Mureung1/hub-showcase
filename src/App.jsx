import { useState } from 'react';
import './App.css';
import { generateDraft, submitProfile } from './api';
import InfoInput from './screens/InfoInput';
import RecommendList from './screens/RecommendList';
import JobDetail from './screens/JobDetail';
import DraftEditor from './screens/DraftEditor';

function App() {
  const [step, setStep] = useState('input');
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftError, setDraftError] = useState('');

  async function handleProfileSubmit(submittedProfile) {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const { recommendations } = await submitProfile(submittedProfile);
      setProfile(submittedProfile);
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

  async function handleGenerateDraft(job) {
    setIsGeneratingDraft(true);
    setDraftError('');

    try {
      const { essayQuestions } = await generateDraft(job.id, profile);
      setSelectedJob({ ...job, essayQuestions });
      setStep('draft');
    } catch (error) {
      setDraftError(error.message);
    } finally {
      setIsGeneratingDraft(false);
    }
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
        <JobDetail
          job={selectedJob}
          onBack={() => setStep('list')}
          onGenerateDraft={handleGenerateDraft}
          isGeneratingDraft={isGeneratingDraft}
          draftError={draftError}
        />
      )}
      {step === 'draft' && <DraftEditor job={selectedJob} onBack={() => setStep('list')} />}
    </main>
  );
}

export default App;
