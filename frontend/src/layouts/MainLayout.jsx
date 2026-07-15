import { logout } from "../utils/auth";

function MainLayout({ children }) {
  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  return (
    <main>
      <header>
        <h1>CalMe</h1>

        <button type="button" onClick={handleLogout}>
          로그아웃
        </button>
      </header>

      {children}
    </main>
  );
}

export default MainLayout;
