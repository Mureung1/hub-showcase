import { useProject, STEPS } from './store';
import ProjectProvider from './StoreProvider';
import CreateWizard from './screens/CreateWizard';
import PlanReview from './screens/PlanReview';
import Survey from './screens/Survey';
import Placeholder from './screens/Placeholder';
import './App.css';

function StepIndicator() {
  const { state } = useProject();
  const currentIndex = STEPS.findIndex((s) => s.id === state.step);

  return (
    <nav className="steps" aria-label="진행 단계">
      {STEPS.map((s, i) => (
        <div
          key={s.id}
          className={`step${i === currentIndex ? ' current' : ''}${i < currentIndex ? ' done' : ''}`}
        >
          <span className="step-num">{i < currentIndex ? '✓' : i + 1}</span>
          <span className="step-label">{s.label}</span>
        </div>
      ))}
    </nav>
  );
}

function Screen() {
  const { state } = useProject();
  switch (state.step) {
    case 'wizard':
      return <CreateWizard />;
    case 'plan':
      return <PlanReview />;
    case 'survey':
      return <Survey />;
    case 'assignment':
      return <Placeholder stage={4} />;
    case 'dashboard':
      return <Placeholder stage={5} />;
    default:
      return <CreateWizard />;
  }
}

function AppShell() {
  const { state, dispatch } = useProject();

  const handleReset = () => {
    if (window.confirm('모든 데이터가 초기화됩니다. 처음부터 다시 시작할까요?')) {
      dispatch({ type: 'RESET' });
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">팀플, 이지!</h1>
        {state.project && (
          <button type="button" className="btn-ghost btn-reset" onClick={handleReset}>
            처음부터 다시
          </button>
        )}
      </header>
      <StepIndicator />
      <main className="app-main">
        <Screen />
      </main>
    </div>
  );
}

function App() {
  return (
    <ProjectProvider>
      <AppShell />
    </ProjectProvider>
  );
}

export default App;
