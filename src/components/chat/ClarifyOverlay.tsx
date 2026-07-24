import type { ClarifyData } from '../../types/overlay';

type Candidate = ClarifyData['candidates'][number];

type ClarifyOverlayProps = {
  data: ClarifyData;
  onSelect: (candidate: Candidate) => void;
  onClose: () => void;
};

export default function ClarifyOverlay({ data, onSelect, onClose }: ClarifyOverlayProps) {
  return (
    <>
      <div className="overlay-dim" onClick={onClose} />
      <div className="overlay-sheet">
        <h3 className="overlay-sheet__title">{data.question}</h3>
        <div className="clarify-options">
          {data.candidates.map((candidate) => (
            <button
              key={`${candidate.intent}-${candidate.type}-${candidate.label}`}
              className="clarify-option"
              onClick={() => onSelect(candidate)}
            >
              {candidate.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
