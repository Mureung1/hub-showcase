import './loading_state.css';

export type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = '불러오는 중' }: LoadingStateProps) {
  return (
    <section aria-label={label} className="loading-state" role="status">
      <div aria-hidden="true" className="loading-state__grid">
        <div className="loading-state__card">
          <span />
          <i />
          <i />
        </div>
        <div className="loading-state__card">
          <span />
          <i />
          <i />
        </div>
        <div className="loading-state__card">
          <span />
          <i />
          <i />
        </div>
      </div>
    </section>
  );
}
