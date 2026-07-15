import type { SessionState } from "../lib/api";

interface Props {
  session: SessionState;
  onLogin: () => void;
  onLogout: () => void;
}

export default function GithubLoginButton({ session, onLogin, onLogout }: Props) {
  if (session.loggedIn) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: "var(--panel-2)",
          borderRadius: 8,
        }}
      >
        <img
          src={session.github_avatar_url}
          alt=""
          width={18}
          height={18}
          style={{ borderRadius: "50%" }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{session.github_login}</div>
          <div className="label-mono" style={{ margin: 0 }}>
            GitHub 연결됨
          </div>
        </div>
        <button onClick={onLogout}>로그아웃</button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 14,
          background: "var(--panel-2)",
          borderRadius: 8,
        }}
      >
        <span style={{ fontSize: 20 }}>🐙</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>GitHub 계정으로 로그인</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
            로그인한 계정이 접근 가능한 저장소 중에서 고를 수 있어요.
          </div>
        </div>
        <button className="primary" onClick={onLogin}>
          로그인
        </button>
      </div>
      <div style={{ fontSize: "11.5px", color: "var(--text-mute)", marginTop: 8 }}>
        ⚠ 이 앱은 저장소 읽기/쓰기(repo) 권한을 요청해요. 로그인한 계정이 접근 가능한 모든 저장소가
        범위에 포함됩니다.
      </div>
    </div>
  );
}
