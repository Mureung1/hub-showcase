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
      <p className="sub" style={{ marginTop: -8 }}>
        추천 성분과 지금 드시는 영양제를 비교했어요.
      </p>

      <div className="card stat-row">
        <div>
          <p className="stat-label">확인한 성분</p>
          <p className="stat-value">3개</p>
        </div>
        <div>
          <p className="stat-label">중복 발견</p>
          <p className="stat-value" style={{ color: 'var(--color-accent-pink)' }}>1개</p>
        </div>
        <div>
          <p className="stat-label">상한 초과</p>
          <p className="stat-value" style={{ color: 'var(--color-accent-green)' }}>없음</p>
        </div>
      </div>

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
