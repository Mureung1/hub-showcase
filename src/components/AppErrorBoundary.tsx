import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Modu Brain render failure", error, errorInfo);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="fatal-error-page" id="main-content" tabIndex={-1}>
        <section className="fatal-error-card" role="alert" aria-labelledby="fatal-error-title">
          <p className="section-kicker">Recovery mode</p>
          <h1 id="fatal-error-title">화면을 안전하게 복구할 수 없습니다</h1>
          <p>
            저장된 프로젝트 데이터는 그대로 유지됩니다. 페이지를 다시 불러오거나 홈에서 작업을 다시 시작해 주세요.
          </p>
          <div className="fatal-error-actions">
            <button className="button primary" type="button" onClick={() => window.location.reload()}>
              페이지 다시 불러오기
            </button>
            <a className="button secondary" href="/">
              홈으로 돌아가기
            </a>
          </div>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
