import { useEffect, useReducer } from "react";
import GithubLoginButton from "../components/GithubLoginButton";
import RepoSelect from "../components/RepoSelect";
import BranchSelect from "../components/BranchSelect";
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
}

type Action =
  | { type: "SESSION_LOADED"; session: SessionState }
  | { type: "LOGOUT" }
  | { type: "REPOS_LOADING" }
  | { type: "REPOS_LOADED"; repos: RepoSummary[] }
  | { type: "SELECT_REPO"; fullName: string }
  | { type: "BRANCHES_LOADING" }
  | { type: "BRANCHES_LOADED"; branches: string[] }
  | { type: "SELECT_BRANCH"; branch: string };

const initialState: State = {
  session: { loggedIn: false },
  sessionLoading: true,
  repos: [],
  reposLoading: false,
  selectedRepo: "",
  branches: [],
  branchesLoading: false,
  selectedBranch: "",
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
      // Picking a different repo invalidates whatever branch was selected for the old one.
      return { ...state, selectedRepo: action.fullName, branches: [], selectedBranch: "" };
    case "BRANCHES_LOADING":
      return { ...state, branchesLoading: true };
    case "BRANCHES_LOADED":
      return { ...state, branches: action.branches, branchesLoading: false };
    case "SELECT_BRANCH":
      return { ...state, selectedBranch: action.branch };
    default:
      return state;
  }
}

export default function RepoConnectPage() {
  const [state, dispatch] = useReducer(reducer, initialState);

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
      .then((res) => res.json())
      .then((repos: RepoSummary[]) => dispatch({ type: "REPOS_LOADED", repos }))
      .catch(() => dispatch({ type: "REPOS_LOADED", repos: [] }));
  }, [state.session.loggedIn]);

  useEffect(() => {
    if (!state.selectedRepo) return;
    dispatch({ type: "BRANCHES_LOADING" });
    fetch(`${API_BASE_URL}/api/repo/${state.selectedRepo}/branches`)
      .then((res) => res.json())
      .then((branches: string[]) => dispatch({ type: "BRANCHES_LOADED", branches }))
      .catch(() => dispatch({ type: "BRANCHES_LOADED", branches: [] }));
  }, [state.selectedRepo]);

  function handleLogin() {
    window.location.href = `${API_BASE_URL}/api/auth/github/login`;
  }

  async function handleLogout() {
    await fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST" });
    dispatch({ type: "LOGOUT" });
  }

  if (state.sessionLoading) return null;

  return (
    <section style={{ padding: "32px 24px", maxWidth: 1080, margin: "0 auto" }}>
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="card-head">
          <span style={{ fontWeight: 500 }}>Repository 연결</span>
        </div>
        <div className="card-body">
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
        </div>
      </div>
    </section>
  );
}
