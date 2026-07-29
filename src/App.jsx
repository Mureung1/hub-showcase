import { useEffect, useState } from 'react';
import './App.css';
import { checkLogin, generateDraft, saveDraft, setAuthHeader as setApiAuthHeader, submitProfile } from './api';
import LoginScreen from './screens/LoginScreen';
import InfoInput from './screens/InfoInput';
import RecommendList from './screens/RecommendList';
import JobDetail from './screens/JobDetail';
import DraftEditor from './screens/DraftEditor';

const SESSION_STORAGE_KEY = 'career-agent-session';

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const initialSession = loadSession();

function App() {
  const [authHeader, setAuthHeader] = useState(initialSession.authHeader ?? null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [step, setStep] = useState(initialSession.step ?? 'input');
  const [profileId, setProfileId] = useState(initialSession.profileId ?? null);
  const [jobs, setJobs] = useState(initialSession.jobs ?? []);
  const [selectedJob, setSelectedJob] = useState(initialSession.selectedJob ?? null);
  const [isDraftSaved, setIsDraftSaved] = useState(initialSession.isDraftSaved ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveDraftError, setSaveDraftError] = useState('');

  useEffect(() => {
    setApiAuthHeader(authHeader);
  }, [authHeader]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ authHeader, step, profileId, jobs, selectedJob, isDraftSaved }),
      );
    } catch {
      // 세션 저장 실패(프라이빗 모드 용량 제한 등)는 새로고침 복원만 못 하는 것이라 무시한다
    }
  }, [authHeader, step, profileId, jobs, selectedJob, isDraftSaved]);

  async function handleLogin(id, password) {
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const header = await checkLogin(id, password);
      setAuthHeader(header);
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleProfileSubmit(submittedProfile) {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const { profileId: newProfileId, recommendations } = await submitProfile(submittedProfile);
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
      const { essayQuestions, isSaved } = await generateDraft(job.id, profileId);
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
      setSelectedJob({
        ...selectedJob,
        essayQuestions: selectedJob.essayQuestions.map((question, index) => ({
          ...question,
          draft: answers[index],
        })),
      });
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

  if (!authHeader) {
    return (
      <main className="page">
        <LoginScreen onLogin={handleLogin} isLoggingIn={isLoggingIn} loginError={loginError} />
      </main>
    );
  }

  return (
    <main className="page">
      {step === 'input' && (
        <InfoInput onSubmit={handleProfileSubmit} isSubmitting={isSubmitting} submitError={submitError} />
      )}
      {step === 'list' && (
        <RecommendList key={profileId} jobs={jobs} onSelectJob={handleSelectJob} onBack={() => setStep('input')} />
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
