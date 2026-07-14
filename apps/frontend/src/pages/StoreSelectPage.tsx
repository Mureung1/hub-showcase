import { useAuth } from "../features/auth";

export function StoreSelectPage() {
  const { signOut, user } = useAuth();

  return (
    <main className="auth-stage">
      <section className="auth-card store-select-card" aria-labelledby="store-select-title">
        <div className="auth-heading">
          <p className="label">STORE</p>
          <h1 id="store-select-title">매장 선택</h1>
        </div>

        <div className="empty-state">
          <strong>매장을 만들거나 초대를 받아야 합니다.</strong>
          <span>{user?.email}</span>
        </div>

        <div className="auth-actions-row">
          <button className="secondary-button" type="button">
            매장 생성
          </button>
          <button className="text-button" onClick={() => void signOut()} type="button">
            로그아웃
          </button>
        </div>
      </section>
    </main>
  );
}
