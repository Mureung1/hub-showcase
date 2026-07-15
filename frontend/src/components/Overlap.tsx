import { ChipIcon } from '../chipIcons';

interface OverlapProps {
  onNext: () => void;
}

const OK_INGREDIENTS = ['루테인은 중복 없음', '안토시아닌은 중복 없음'];

export function Overlap({ onNext }: OverlapProps) {
  return (
    <>
      <h1 className="heading" style={{ fontSize: 22 }}>
        성분 중복을
        <br />
        확인했어요
      </h1>

      <div className="chip-list">
        <span className="chip-badge">
          <span
            className="chip-icon"
            style={{ background: 'var(--tint-pink)', color: 'var(--color-accent-pink)' }}
          >
            <ChipIcon name="warning" />
          </span>
          <span className="chip-label">비타민A가 겹쳐요</span>
        </span>
      </div>

      <div className="chip-list">
        {OK_INGREDIENTS.map((label) => (
          <span className="chip-badge" key={label}>
            <span
              className="chip-icon"
              style={{ background: 'var(--tint-green)', color: 'var(--color-accent-green)' }}
            >
              <ChipIcon name="check" />
            </span>
            <span className="chip-label">{label}</span>
          </span>
        ))}
      </div>

      <button className="btn" type="button" onClick={onNext}>
        다음
      </button>
    </>
  );
}
