import './loading_state.css';

export type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = '불러오는 중' }: LoadingStateProps) {
  return (
    <section aria-label={label} className="loading-state" role="status">
      <span className="loading-state__label">{label}</span>
      <div aria-hidden="true" className="loading-state__grid">
        <div className="loading-state__card">
          <span className="loading-state__placeholder loading-state__media" />
          <span className="loading-state__placeholder loading-state__line" />
          <span className="loading-state__placeholder loading-state__line" />
        </div>
        <div className="loading-state__card">
          <span className="loading-state__placeholder loading-state__media" />
          <span className="loading-state__placeholder loading-state__line" />
          <span className="loading-state__placeholder loading-state__line" />
        </div>
        <div className="loading-state__card">
          <span className="loading-state__placeholder loading-state__media" />
          <span className="loading-state__placeholder loading-state__line" />
          <span className="loading-state__placeholder loading-state__line" />
        </div>
      </div>
    </section>
  );
}
