import type { ResolvedParseResult } from '@shared/schemas';
import type { ClarifyData } from '../../types/overlay';

type ClarifyOverlayProps = {
  data: ClarifyData;
  onSelect: (candidate: ResolvedParseResult) => void;
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
              key={`${candidate.intent}-${candidate.item.type}`}
              className="clarify-option"
              onClick={() =>
                onSelect({ status: 'resolved', intent: candidate.intent, item: candidate.item })
              }
            >
              {candidate.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
