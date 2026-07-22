import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { CanvasSpriteAnimator } from "./CanvasSpriteAnimator";
import { getSpriteReviewAnimations, getSpriteReviewSet, spriteReviewSets, type SpriteReviewSetId } from "../data/spriteReviewAssets";
import type { SpriteAnimationAsset } from "../data/assetManifest";

const scaleOptions = [2, 3, 4] as const;
const speedOptions = [0.5, 1, 1.5, 2] as const;
const attachSideOptions = ["bottom", "left", "right", "top"] as const;
const placementMotionOptions = ["hanging", "hiding", "climbing", "jump"] as const;
const mockWindow = { x: 140, y: 62, width: 420, height: 190 };

type AttachSide = (typeof attachSideOptions)[number];
type PlacementMotion = (typeof placementMotionOptions)[number];

interface PlacementDraft {
  offsetX: number;
  offsetY: number;
  scale: number;
  edge: AttachSide;
  mirrorX: boolean;
}

type PlacementDraftsByMotion = Record<PlacementMotion, Record<AttachSide, PlacementDraft>>;
type PlacementDraftsBySet = Partial<Record<SpriteReviewSetId, PlacementDraftsByMotion>>;

function placement(edge: AttachSide, offsetX = 0, offsetY = 0, scale = 1, mirrorX = false): PlacementDraft {
  return { edge, offsetX, offsetY, scale, mirrorX };
}

const defaultPlacementDrafts: PlacementDraftsByMotion = {
  hanging: {
    bottom: placement("bottom", 0, -8),
    left: placement("left", -6, 0),
    right: placement("right", 6, 0, 1, true),
    top: placement("top", 0, 8),
  },
  hiding: {
    bottom: placement("bottom", 0, 8),
    left: placement("left", -6, 0),
    right: placement("right", 6, 0, 1, true),
    top: placement("top", 0, -8),
  },
  climbing: {
    bottom: placement("bottom", 0, -8),
    left: placement("left", -4, 0),
    right: placement("right", 4, 0, 1, true),
    top: placement("top", 0, 8),
  },
  jump: {
    bottom: placement("bottom", 0, -16),
    left: placement("left", -10, -8),
    right: placement("right", 10, -8, 1, true),
    top: placement("top", 0, 12),
  },
};

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
  const [placementMotion, setPlacementMotion] = useState<PlacementMotion>("hanging");
  const [attachSide, setAttachSide] = useState<AttachSide>("bottom");
  const [placementDrafts, setPlacementDrafts] = useState<PlacementDraftsBySet>({});
  const [showAnchor, setShowAnchor] = useState(true);
  const reviewSet = getSpriteReviewSet(reviewSetId);
  const currentSetPlacements = placementDrafts[reviewSetId] ?? defaultPlacementDrafts;
  const currentPlacement = currentSetPlacements[placementMotion][attachSide];
  const baseAnimations = useMemo(() => getSpriteReviewAnimations(reviewSetId), [reviewSetId]);
  const animations = useMemo(
    () => baseAnimations.map((animation) => withSpeed(animation, speed)),
    [baseAnimations, speed],
  );
  const selectedBaseAnimation = baseAnimations.find((animation) => animation.states[0] === placementMotion) ?? baseAnimations[0];
  const selectedAnimation = withSpeed(selectedBaseAnimation, speed);
  const previewSpriteScale = scale * currentPlacement.scale;
  const anchorX = (currentPlacement.mirrorX ? selectedAnimation.frameWidth - selectedAnimation.anchor.x : selectedAnimation.anchor.x) * previewSpriteScale;
  const anchorY = selectedAnimation.anchor.y * previewSpriteScale;
  const edgePoint = getMockEdgePoint(currentPlacement.edge);
  const spriteLeft = edgePoint.x + currentPlacement.offsetX - anchorX;
  const spriteTop = edgePoint.y + currentPlacement.offsetY - anchorY;
  const placementSnippet = `placement: {\n${placementMotionOptions
    .map((motion) => {
      const sides = attachSideOptions
        .map((side) => {
          const sidePlacement = currentSetPlacements[motion][side];
          return `    ${side}: { offsetX: ${sidePlacement.offsetX}, offsetY: ${sidePlacement.offsetY}, scale: ${sidePlacement.scale.toFixed(2)}, edge: "${sidePlacement.edge}", mirrorX: ${sidePlacement.mirrorX} },`;
        })
        .join("\n");
      return `  ${motion}: {\n${sides}\n  },`;
    })
    .join("\n")}\n}`;

  function updatePlacement(nextPlacement: Partial<PlacementDraft>) {
    setPlacementDrafts((drafts) => {
      const setDrafts = drafts[reviewSetId] ?? defaultPlacementDrafts;
      return {
        ...drafts,
        [reviewSetId]: {
          ...setDrafts,
          [placementMotion]: {
            ...setDrafts[placementMotion],
            [attachSide]: {
              ...setDrafts[placementMotion][attachSide],
              ...nextPlacement,
            },
          },
        },
      };
    });
  }

  return (
    <main className="sprite-review-page" aria-label="Sprite sheet review tool">
      <header className="sprite-review-header">
        <div>
          <p className="sprite-review-kicker">Production Sprite Review</p>
          <h1>{reviewSet.label}</h1>
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
          <label>
            Attach side
            <select
              value={attachSide}
              onChange={(event) => {
                const nextSide = event.target.value as AttachSide;
                setAttachSide(nextSide);
              }}
            >
              {attachSideOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Motion
            <select
              value={placementMotion}
              onChange={(event) => setPlacementMotion(event.target.value as typeof placementMotion)}
            >
              {placementMotionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="sprite-placement-controls" aria-label="placement tuning controls">
        <label>
          offsetX
          <input
            type="number"
            value={currentPlacement.offsetX}
            onChange={(event) => updatePlacement({ offsetX: Number(event.target.value) })}
            step={1}
          />
        </label>
        <label>
          offsetY
          <input
            type="number"
            value={currentPlacement.offsetY}
            onChange={(event) => updatePlacement({ offsetY: Number(event.target.value) })}
            step={1}
          />
        </label>
        <label>
          scale
          <input
            type="number"
            value={currentPlacement.scale}
            onChange={(event) => updatePlacement({ scale: Number(event.target.value) })}
            min={0.5}
            max={3}
            step={0.05}
          />
        </label>
        <label className="sprite-review-check">
          <input type="checkbox" checked={showAnchor} onChange={(event) => setShowAnchor(event.target.checked)} />
          anchor
        </label>
        <label className="sprite-review-check">
          <input
            type="checkbox"
            checked={currentPlacement.mirrorX}
            onChange={(event) => updatePlacement({ mirrorX: event.target.checked })}
          />
          mirrorX
        </label>
        <pre>{placementSnippet}</pre>
      </section>

      <section
        className="sprite-placement-preview"
        aria-label={`${placementMotion} placement preview for ${reviewSet.label}`}
      >
        <div className="sprite-placement-preview-stage">
          <section
            className="sprite-placement-window-mock"
            style={
              {
                "--mock-window-x": `${mockWindow.x}px`,
                "--mock-window-y": `${mockWindow.y}px`,
                "--mock-window-width": `${mockWindow.width}px`,
                "--mock-window-height": `${mockWindow.height}px`,
              } as CSSProperties &
                Record<"--mock-window-x" | "--mock-window-y" | "--mock-window-width" | "--mock-window-height", string>
            }
          >
            <div className="sprite-placement-titlebar">
              <span>{currentPlacement.edge === "left" || currentPlacement.edge === "right" ? "Recovery Quest" : "QuestRunner.exe"}</span>
              <i />
              <i />
              <i />
            </div>
            <div className="sprite-placement-window-body">
              <div />
              <div />
              <button type="button">Accept</button>
            </div>
          </section>

          <div
            className="sprite-placement-window-pet"
            style={
              {
                "--placement-sprite-left": `${spriteLeft}px`,
                "--placement-sprite-top": `${spriteTop}px`,
                "--placement-sprite-size": `${64 * previewSpriteScale}px`,
              } as CSSProperties &
                Record<"--placement-sprite-left" | "--placement-sprite-top" | "--placement-sprite-size", string>
            }
          >
            <CanvasSpriteAnimator
              animation={selectedAnimation}
              ariaLabel={`${placementMotion} ${reviewSet.label} placement preview`}
              forceMotion
              mirrorX={currentPlacement.mirrorX}
            />
            {showAnchor ? (
              <span
                className="sprite-review-anchor"
                style={
                  {
                    "--anchor-x": `${anchorX}px`,
                    "--anchor-y": `${anchorY}px`,
                  } as CSSProperties & Record<"--anchor-x" | "--anchor-y", string>
                }
              />
            ) : null}
          </div>
        </div>
        <p>
          The anchor point is aligned to the selected window side first, then offsetX/offsetY are applied per manager,
          motion, and side.
        </p>
      </section>

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
                  ariaLabel={`${animation.states[0]} ${reviewSet.label} animation preview`}
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

function getMockEdgePoint(edge: AttachSide) {
  if (edge === "top") return { x: mockWindow.x + mockWindow.width / 2, y: mockWindow.y };
  if (edge === "left") return { x: mockWindow.x, y: mockWindow.y + mockWindow.height / 2 };
  if (edge === "right") return { x: mockWindow.x + mockWindow.width, y: mockWindow.y + mockWindow.height / 2 };
  return { x: mockWindow.x + mockWindow.width / 2, y: mockWindow.y + mockWindow.height };
}
