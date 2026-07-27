import { useEffect, useReducer, useState } from "react";
import { useNavigate } from "react-router-dom";
import GithubLoginButton from "../components/GithubLoginButton";
import RepoSelect from "../components/RepoSelect";
import BranchSelect from "../components/BranchSelect";
import AnalysisPresetPicker, { type AnalysisPreset } from "../components/AnalysisPresetPicker";
import { API_BASE_URL, type RepoSummary, type SessionState } from "../lib/api";

interface State {
  session: SessionState;
  sessionLoading: boolean;
  repos: RepoSummary[];
  reposLoading: boolean;
  selectedRepo: string;
  branches: string[];
  branchesLoading: boolean;
  selectedBranch: string;
  selectedPreset: AnalysisPreset | "";
  errorMessage: string | null;
}

type Action =
  | { type: "SESSION_LOADED"; session: SessionState }
  | { type: "LOGOUT" }
  | { type: "REPOS_LOADING" }
  | { type: "REPOS_LOADED"; repos: RepoSummary[] }
  | { type: "SELECT_REPO"; fullName: string }
  | { type: "BRANCHES_LOADING" }
  | { type: "BRANCHES_LOADED"; branches: string[] }
  | { type: "SELECT_BRANCH"; branch: string }
  | { type: "SELECT_PRESET"; preset: AnalysisPreset }
  | { type: "ERROR"; message: string };

const initialState: State = {
  session: { loggedIn: false },
  sessionLoading: true,
  repos: [],
  reposLoading: false,
  selectedRepo: "",
  branches: [],
  branchesLoading: false,
  selectedBranch: "",
  selectedPreset: "",
  errorMessage: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SESSION_LOADED":
      return { ...state, session: action.session, sessionLoading: false };
    case "LOGOUT":
      return { ...initialState, sessionLoading: false };
    case "REPOS_LOADING":
      return { ...state, reposLoading: true };
    case "REPOS_LOADED":
      return { ...state, repos: action.repos, reposLoading: false };
    case "SELECT_REPO":
      // Picking a different repo invalidates whatever branch/preset was chosen for the old one.
      return {
        ...state,
        selectedRepo: action.fullName,
        branches: [],
        selectedBranch: "",
        selectedPreset: "",
        errorMessage: null,
      };
    case "BRANCHES_LOADING":
      return { ...state, branchesLoading: true };
    case "BRANCHES_LOADED":
      return { ...state, branches: action.branches, branchesLoading: false };
    case "SELECT_BRANCH":
      return { ...state, selectedBranch: action.branch, selectedPreset: "" };
    case "SELECT_PRESET":
      return { ...state, selectedPreset: action.preset };
    case "ERROR":
      // Deliberately not cleared by REPOS_LOADED/BRANCHES_LOADED: those fire
      // automatically right after login, which would wipe an OAuth-callback
      // error before the user ever saw it. Only an explicit retry (picking a
      // repo/branch again) or a new error clears this.
      return { ...state, errorMessage: action.message, reposLoading: false, branchesLoading: false };
    default:
      return state;
  }
}

export default function RepoConnectPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  // Surfaces OAuth failures (denied/cancelled login, token exchange errors) that the
  // backend reports via a redirect to /repo?error=... instead of a raw error page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      dispatch({ type: "ERROR", message: error });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/auth/session`)
      .then((res) => res.json())
      .then((session: SessionState) => dispatch({ type: "SESSION_LOADED", session }))
      .catch(() => dispatch({ type: "SESSION_LOADED", session: { loggedIn: false } }));
  }, []);

  useEffect(() => {
    if (!state.session.loggedIn) return;
    dispatch({ type: "REPOS_LOADING" });
    fetch(`${API_BASE_URL}/api/repo/list`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((repos: RepoSummary[]) => dispatch({ type: "REPOS_LOADED", repos }))
      .catch(() => dispatch({ type: "ERROR", message: "저장소 목록을 불러오지 못했습니다." }));
  }, [state.session.loggedIn]);

  useEffect(() => {
    if (!state.selectedRepo) return;
    dispatch({ type: "BRANCHES_LOADING" });
    fetch(`${API_BASE_URL}/api/repo/${state.selectedRepo}/branches`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((branches: string[]) => dispatch({ type: "BRANCHES_LOADED", branches }))
      .catch(() => dispatch({ type: "ERROR", message: "Branch 목록을 불러오지 못했습니다." }));
  }, [state.selectedRepo]);

  function handleLogin() {
    window.location.href = `${API_BASE_URL}/api/auth/github/login`;
  }

  async function handleLogout() {
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST" });
    dispatch({ type: "LOGOUT" });
  }

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/analysis/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoId: state.selectedRepo,
          branch: state.selectedBranch,
          preset: state.selectedPreset,
        }),
      });
      if (!res.ok) throw new Error("analysis start failed");
      navigate("/analysis");
    } catch {
      setStarting(false);
      dispatch({ type: "ERROR", message: "분석 시작에 실패했습니다. 다시 시도해주세요." });
    }
  }

  if (state.sessionLoading) return null;

  const canStart = state.selectedBranch !== "" && state.selectedPreset !== "" && !starting;

  return (
    <section style={{ padding: "32px 24px", maxWidth: 1080, margin: "0 auto" }}>
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="card-head">
          <span style={{ fontWeight: 500 }}>Repository 연결</span>
        </div>
        <div className="card-body">
          {state.errorMessage && (
            <div
              style={{
                background: "var(--red-bg)",
                color: "var(--red)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 12.5,
                marginBottom: 16,
              }}
            >
              {state.errorMessage}
            </div>
          )}

          <GithubLoginButton session={state.session} onLogin={handleLogin} onLogout={handleLogout} />

          <div style={{ marginTop: 16 }}>
            <RepoSelect
              repos={state.repos}
              value={state.selectedRepo}
              disabled={!state.session.loggedIn}
              loading={state.reposLoading}
              onChange={(fullName) => dispatch({ type: "SELECT_REPO", fullName })}
            />
            <BranchSelect
              branches={state.branches}
              value={state.selectedBranch}
              disabled={!state.selectedRepo}
              loading={state.branchesLoading}
              onChange={(branch) => dispatch({ type: "SELECT_BRANCH", branch })}
            />
          </div>

          <AnalysisPresetPicker
            value={state.selectedPreset}
            disabled={!state.selectedBranch}
            onChange={(preset) => dispatch({ type: "SELECT_PRESET", preset })}
          />
        </div>
        <div className="card-foot">
          <button className="primary" disabled={!canStart} onClick={handleStart}>
            연결 및 분석 시작 →
          </button>
        </div>
      </div>
    </section>
  );
}
