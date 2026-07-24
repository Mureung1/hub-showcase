import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { CanvasSpriteAnimator } from "./CanvasSpriteAnimator";
import { getSpriteReviewAnimations, getSpriteReviewSet, spriteReviewSets, type SpriteReviewSetId } from "../data/spriteReviewAssets";
import type { SpriteAnimationAsset } from "../data/assetManifest";
import {
  defaultWindowPetPlacementDrafts,
  readWindowPetPlacementDrafts,
  resolveWindowPetPosition,
  runtimeWindowPetSlots,
  windowPetPlacementStorageKey,
  type WindowPetAttachSide,
  type WindowPetMotion,
  type WindowPetPlacementDraft,
  type WindowPetPlacementDraftsByMotion,
} from "../data/windowPetPlacements";

const scaleOptions = [2, 3, 4] as const;
const speedOptions = [0.5, 1, 1.5, 2] as const;
const attachSideOptions = ["bottom", "left", "right", "top"] as const;
const placementMotionOptions = ["hanging", "hiding", "climbing", "jump"] as const;
const questMockWindow = { x: 140, y: 62, ...runtimeWindowPetSlots["below-quest"].windowSize };
const recoveryMockWindow = { x: 140, y: 62, ...runtimeWindowPetSlots["beside-recovery"].windowSize };

type PlacementDraftsBySet = Partial<Record<SpriteReviewSetId, PlacementDraftsByMotion>>;
type AttachSide = WindowPetAttachSide;
type PlacementMotion = WindowPetMotion;
type PlacementDraft = WindowPetPlacementDraft;
type PlacementDraftsByMotion = WindowPetPlacementDraftsByMotion;

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
  const [reviewSetId, setReviewSetId] = useState<SpriteReviewSetId>("pink-manager-stage-2-production-candidates");
  const [placementMotion, setPlacementMotion] = useState<PlacementMotion>("hanging");
  const [attachSide, setAttachSide] = useState<AttachSide>("bottom");
  const [placementDrafts, setPlacementDrafts] = useState<PlacementDraftsBySet>(() => ({
    "pink-manager-stage-2": readWindowPetPlacementDrafts((key) => window.localStorage.getItem(key)),
    "pink-manager-stage-2-production-candidates": readWindowPetPlacementDrafts((key) => window.localStorage.getItem(key)),
  }));
  const [saveMessage, setSaveMessage] = useState("");
  const [showAnchor, setShowAnchor] = useState(true);
  const reviewSet = getSpriteReviewSet(reviewSetId);
  const currentSetPlacements = placementDrafts[reviewSetId] ?? defaultWindowPetPlacementDrafts;
  const currentPlacement = currentSetPlacements[placementMotion][attachSide];
  const mockWindow = placementMotion === "hiding" ? recoveryMockWindow : questMockWindow;
  const baseAnimations = useMemo(() => getSpriteReviewAnimations(reviewSetId), [reviewSetId]);
  const animations = useMemo(
    () => baseAnimations.map((animation) => withSpeed(animation, speed)),
    [baseAnimations, speed],
  );
  const selectedBaseAnimation = baseAnimations.find((animation) => animation.states[0] === placementMotion) ?? baseAnimations[0];
  const selectedAnimation = withSpeed(selectedBaseAnimation, speed);
  const edgePoint = getMockEdgePoint(mockWindow, currentPlacement.edge);
  const resolvedPreviewPosition = resolveWindowPetPosition({
    placement: currentPlacement,
    windowPosition: { x: mockWindow.x, y: mockWindow.y },
    windowSize: { width: mockWindow.width, height: mockWindow.height },
    frameWidth: selectedAnimation.frameWidth,
    anchor: selectedAnimation.anchor,
    baseSpriteSize: selectedAnimation.frameWidth * scale,
  });
  const previewSpriteScale = resolvedPreviewPosition.size / selectedAnimation.frameWidth;
  const anchorX = (currentPlacement.mirrorX ? selectedAnimation.frameWidth - selectedAnimation.anchor.x : selectedAnimation.anchor.x) * previewSpriteScale;
  const anchorY = selectedAnimation.anchor.y * previewSpriteScale;
  const spriteLeft = resolvedPreviewPosition.left;
  const spriteTop = resolvedPreviewPosition.top;
  const finalAnchorX = edgePoint.x + currentPlacement.offsetX;
  const finalAnchorY = edgePoint.y + currentPlacement.offsetY;
  const placementSnippet = `placement: {\n${placementMotionOptions
    .map((motion) => {
      const sides = attachSideOptions
        .map((side) => {
          const sidePlacement = currentSetPlacements[motion][side];
          return `    ${side}: { offsetX: ${sidePlacement.offsetX}, offsetY: ${sidePlacement.offsetY}, scale: ${sidePlacement.scale.toFixed(2)}, edge: "${sidePlacement.edge}", mirrorX: ${sidePlacement.mirrorX}, layer: "${sidePlacement.layer}" },`;
        })
        .join("\n");
      return `  ${motion}: {\n${sides}\n  },`;
    })
    .join("\n")}\n}`;

  function updatePlacement(nextPlacement: Partial<PlacementDraft>) {
    setPlacementDrafts((drafts) => {
      const setDrafts = drafts[reviewSetId] ?? defaultWindowPetPlacementDrafts;
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
    setSaveMessage("");
  }

  function savePlacementForRuntime() {
    window.localStorage.setItem(windowPetPlacementStorageKey, JSON.stringify(currentSetPlacements));
    setPlacementDrafts((drafts) => ({
      ...drafts,
      "pink-manager-stage-2": currentSetPlacements,
      "pink-manager-stage-2-production-candidates": currentSetPlacements,
    }));
    setSaveMessage("Saved for runtime preview on this browser origin.");
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
          fixed anchor
        </label>
        <label className="sprite-review-check">
          <input
            type="checkbox"
            checked={currentPlacement.mirrorX}
            onChange={(event) => updatePlacement({ mirrorX: event.target.checked })}
          />
          mirrorX
        </label>
        <label className="sprite-review-check">
          <input
            type="checkbox"
            checked={currentPlacement.layer === "behind-window"}
            onChange={(event) => updatePlacement({ layer: event.target.checked ? "behind-window" : "front" })}
          />
          behind window
        </label>
        <pre>{placementSnippet}</pre>
        <div className="sprite-placement-anchor-readout">
          <strong>Anchor is locked by motion</strong>
          <span>
            {selectedAnimation.anchor.type}: {selectedAnimation.anchor.x}, {selectedAnimation.anchor.y}
            {currentPlacement.mirrorX ? ` -> mirrored ${selectedAnimation.frameWidth - selectedAnimation.anchor.x}, ${selectedAnimation.anchor.y}` : ""}
          </span>
        </div>
        <button type="button" onClick={savePlacementForRuntime}>
          Save placement
        </button>
        <p className="sprite-placement-save-message">
          {saveMessage || "Save writes this placement to the same browser origin used by the runtime preview."}
        </p>
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

          {showAnchor ? (
            <>
              <span
                className="sprite-placement-edge-target"
                style={
                  {
                    "--edge-target-x": `${edgePoint.x}px`,
                    "--edge-target-y": `${edgePoint.y}px`,
                  } as CSSProperties & Record<"--edge-target-x" | "--edge-target-y", string>
                }
              />
              <span
                className="sprite-placement-final-anchor"
                style={
                  {
                    "--final-anchor-x": `${finalAnchorX}px`,
                    "--final-anchor-y": `${finalAnchorY}px`,
                  } as CSSProperties & Record<"--final-anchor-x" | "--final-anchor-y", string>
                }
              />
            </>
          ) : null}

          <div
            className={`sprite-placement-window-pet ${currentPlacement.layer === "behind-window" ? "behind-window" : "front-layer"}`}
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
          The pink cross is the fixed sprite anchor after offset. The cyan cross is the raw window side target before
          offset.
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

function getMockEdgePoint(mockWindow: typeof questMockWindow | typeof recoveryMockWindow, edge: AttachSide) {
  if (edge === "top") return { x: mockWindow.x + mockWindow.width / 2, y: mockWindow.y };
  if (edge === "left") return { x: mockWindow.x, y: mockWindow.y + mockWindow.height / 2 };
  if (edge === "right") return { x: mockWindow.x + mockWindow.width, y: mockWindow.y + mockWindow.height / 2 };
  return { x: mockWindow.x + mockWindow.width / 2, y: mockWindow.y + mockWindow.height };
}
