import { useState } from 'react';
import './App.css';
import { generateDraft, saveDraft, submitProfile } from './api';
import InfoInput from './screens/InfoInput';
import RecommendList from './screens/RecommendList';
import JobDetail from './screens/JobDetail';
import DraftEditor from './screens/DraftEditor';

function App() {
  const [step, setStep] = useState('input');
  const [profile, setProfile] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveDraftError, setSaveDraftError] = useState('');

  async function handleProfileSubmit(submittedProfile) {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const { profileId: newProfileId, recommendations } = await submitProfile(submittedProfile);
      setProfile(submittedProfile);
      setProfileId(newProfileId);
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
    setDraftError('');
    setStep('detail');
  }

  async function handleGenerateDraft(job) {
    setIsGeneratingDraft(true);
    setDraftError('');
    setSaveDraftError('');

    try {
      const { essayQuestions, isSaved } = await generateDraft(job.id, profileId, profile);
      setSelectedJob({ ...job, essayQuestions });
      setIsDraftSaved(isSaved);
      setStep('draft');
    } catch (error) {
      setDraftError(error.message);
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  async function handleSaveDraft(answers) {
    setIsSavingDraft(true);
    setSaveDraftError('');

    try {
      await saveDraft(selectedJob.id, profileId, answers);
      setIsDraftSaved(true);
    } catch (error) {
      setSaveDraftError(error.message);
    } finally {
      setIsSavingDraft(false);
    }
  }

  function handleUnlockDraft() {
    setIsDraftSaved(false);
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
      {step === 'draft' && (
        <DraftEditor
          job={selectedJob}
          onBack={() => setStep('list')}
          isSaved={isDraftSaved}
          isSaving={isSavingDraft}
          saveError={saveDraftError}
          onSave={handleSaveDraft}
          onUnlock={handleUnlockDraft}
        />
      )}
    </main>
  );
}

export default App;
