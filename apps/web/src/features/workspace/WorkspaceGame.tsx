import { useEffect, useRef, useState } from "react";
import { InteractionPrompt } from "./components/InteractionPrompt";
import type {
  WorkspaceGameHandle,
  WorkspaceInteraction,
} from "./model/workspace.types";

type WorkspaceGameProps = {
  isInputEnabled: boolean;
  onOpenNewAnalysis: () => void;
};

export function WorkspaceGame({
  isInputEnabled,
  onOpenNewAnalysis,
}: WorkspaceGameProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<WorkspaceGameHandle | null>(null);
  const openAnalysisRef = useRef(onOpenNewAnalysis);
  const inputEnabledRef = useRef(isInputEnabled);
  const [interaction, setInteraction] = useState<WorkspaceInteraction | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    openAnalysisRef.current = onOpenNewAnalysis;
  }, [onOpenNewAnalysis]);

  useEffect(() => {
    if (!mountRef.current) {
      return;
    }

    let isCancelled = false;
    const mountElement = mountRef.current;

    void import("./game/createWorkspaceGame")
      .then(({ createWorkspaceGame }) => {
        if (isCancelled) {
          return;
        }

        const game = createWorkspaceGame(mountElement, (event) => {
          if (event.type === "interaction-changed") {
            setInteraction(event.interaction);
          }

          if (event.type === "open-new-analysis") {
            openAnalysisRef.current();
          }
        });
        gameRef.current = game;
        game.setInputEnabled(inputEnabledRef.current);
        game.focus();
      })
      .catch(() => {
        if (!isCancelled) {
          setLoadError("작업실을 불러오지 못했습니다.");
        }
      });

    return () => {
      isCancelled = true;
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, [loadAttempt]);

  useEffect(() => {
    inputEnabledRef.current = isInputEnabled;
    gameRef.current?.setInputEnabled(isInputEnabled);

    if (isInputEnabled) {
      gameRef.current?.focus();
    }
  }, [isInputEnabled]);

  return (
    <div className="workspace-game-frame">
      <div ref={mountRef} className="workspace-game-canvas" />
      {loadError && (
        <div className="workspace-load-error" role="alert">
          <strong>{loadError}</strong>
          <button
            type="button"
            onClick={() => {
              setLoadError("");
              setLoadAttempt((attempt) => attempt + 1);
            }}
          >
            다시 시도
          </button>
        </div>
      )}
      <InteractionPrompt interaction={interaction} />
    </div>
  );
}
