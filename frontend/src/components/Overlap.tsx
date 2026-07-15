interface OverlapProps {
  onNext: () => void;
}

export function Overlap({ onNext }: OverlapProps) {
  return (
    <>
      <h1 className="heading" style={{ fontSize: 22 }}>
        성분 중복을
        <br />
        확인했어요
      </h1>

      <div className="warn-box">
        <span>⚠</span>
        <span>비타민A가 겹쳐요</span>
      </div>

      <p className="ok-row">루테인은 중복 없음</p>
      <p className="ok-row">안토시아닌은 중복 없음</p>

      <button className="btn" type="button" onClick={onNext}>
        다음
      </button>
    </>
  );
}
