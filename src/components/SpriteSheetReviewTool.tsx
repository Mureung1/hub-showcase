import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { CanvasSpriteAnimator } from "./CanvasSpriteAnimator";
import { getSpriteReviewAnimations, getSpriteReviewSet, spriteReviewSets, type SpriteReviewSetId } from "../data/spriteReviewAssets";
import type { SpriteAnimationAsset } from "../data/assetManifest";

const scaleOptions = [2, 3, 4] as const;
const speedOptions = [0.5, 1, 1.5, 2] as const;

function withSpeed(animation: SpriteAnimationAsset, speed: number): SpriteAnimationAsset {
  return {
    ...animation,
    id: `${animation.id}-speed-${speed}`,
    fps: Math.max(1, Math.round(animation.fps * speed)),
    loop: true,
  };
}

export function SpriteSheetReviewTool() {
  const [scale, setScale] = useState<(typeof scaleOptions)[number]>(3);
  const [speed, setSpeed] = useState<(typeof speedOptions)[number]>(1);
  const [reviewSetId, setReviewSetId] = useState<SpriteReviewSetId>("pink-manager-stage-1-production-candidates");
  const reviewSet = getSpriteReviewSet(reviewSetId);
  const baseAnimations = useMemo(() => getSpriteReviewAnimations(reviewSetId), [reviewSetId]);
  const animations = useMemo(
    () => baseAnimations.map((animation) => withSpeed(animation, speed)),
    [baseAnimations, speed],
  );

  return (
    <main className="sprite-review-page" aria-label="Sprite sheet review tool">
      <header className="sprite-review-header">
        <div>
          <p className="sprite-review-kicker">Production Sprite Review</p>
          <h1>Pink Manager Stage 1</h1>
          <p>
            {reviewSet.description}
            Animation playback is forced here even when the OS reduced-motion setting is enabled.
          </p>
        </div>
        <div className="sprite-review-controls" aria-label="review controls">
          <label>
            Set
            <select value={reviewSetId} onChange={(event) => setReviewSetId(event.target.value as SpriteReviewSetId)}>
              {spriteReviewSets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Scale
            <select value={scale} onChange={(event) => setScale(Number(event.target.value) as typeof scale)}>
              {scaleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}x
                </option>
              ))}
            </select>
          </label>
          <label>
            Speed
            <select value={speed} onChange={(event) => setSpeed(Number(event.target.value) as typeof speed)}>
              {speedOptions.map((option) => (
                <option key={option} value={option}>
                  {option}x
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section
        className="sprite-review-grid"
        style={{ "--review-scale": String(scale) } as CSSProperties & Record<"--review-scale", string>}
      >
        {animations.map((animation) => {
          const baseAnimation = baseAnimations.find(
            (item) => item.id === animation.id.replace(`-speed-${speed}`, ""),
          );
          return (
            <article className="sprite-review-card" key={animation.id}>
              <div className="sprite-review-card-head">
                <div>
                  <h2>{animation.states[0]}</h2>
                  <p>
                    {animation.frameCount} frames | {animation.fps} fps | preview loop
                  </p>
                </div>
                <span>{animation.anchor.type}</span>
              </div>

              <div className="sprite-review-stage">
                <CanvasSpriteAnimator
                  animation={animation}
                  ariaLabel={`${animation.states[0]} pink manager animation preview`}
                  forceMotion
                />
              </div>

              <div className="sprite-review-sheet">
                <img src={animation.src} alt={`${animation.states[0]} source sheet`} />
              </div>

              <dl className="sprite-review-meta">
                <div>
                  <dt>Path</dt>
                  <dd>{animation.src}</dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>
                    {animation.sheetWidth}x{animation.sheetHeight}
                  </dd>
                </div>
                <div>
                  <dt>Anchor</dt>
                  <dd>
                    {animation.anchor.x}, {animation.anchor.y}
                  </dd>
                </div>
              </dl>

              <p className="sprite-review-note">{baseAnimation?.notes}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
