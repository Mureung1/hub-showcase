import GithubLoginButton from "../components/GithubLoginButton";

export default function RepoConnectPage() {
  return (
    <section style={{ padding: "32px 24px", maxWidth: 1080, margin: "0 auto" }}>
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="card-head">
          <span style={{ fontWeight: 500 }}>Repository 연결</span>
        </div>
        <div className="card-body">
          <GithubLoginButton />
        </div>
      </div>
    </section>
  );
}
