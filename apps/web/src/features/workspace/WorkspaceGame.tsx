import { useEffect, useRef, useState } from "react";
import { InteractionPrompt } from "./components/InteractionPrompt";
import type {
  WorkspaceGameHandle,
  WorkspaceInteraction,
} from "./model/workspace.types";

type WorkspaceGameProps = {
  isInputEnabled: boolean;
  onOpenNewAnalysis: () => void;
  repositoryInteractions?: WorkspaceInteraction[];
  onOpenRepository?: (repositoryId: string) => void;
};

export function WorkspaceGame({
  isInputEnabled,
  onOpenNewAnalysis,
  repositoryInteractions = [],
  onOpenRepository,
}: WorkspaceGameProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<WorkspaceGameHandle | null>(null);
  const openAnalysisRef = useRef(onOpenNewAnalysis);
  const inputEnabledRef = useRef(isInputEnabled);
  const repositoryInteractionsRef = useRef(repositoryInteractions);
  const openRepositoryRef = useRef(onOpenRepository);
  const [interaction, setInteraction] = useState<WorkspaceInteraction | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    openAnalysisRef.current = onOpenNewAnalysis;
  }, [onOpenNewAnalysis]);

  useEffect(() => {
    repositoryInteractionsRef.current = repositoryInteractions;
    gameRef.current?.setRepositoryInteractions(repositoryInteractions);
  }, [repositoryInteractions]);

  useEffect(() => {
    openRepositoryRef.current = onOpenRepository;
  }, [onOpenRepository]);

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

          if (event.type === "open-repository") {
            openRepositoryRef.current?.(event.repositoryId);
          }
        });
        gameRef.current = game;
        game.setInputEnabled(inputEnabledRef.current);
        game.setRepositoryInteractions(repositoryInteractionsRef.current);
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
    <div className="absolute inset-0 z-0 h-full w-full bg-ptop-mint-soft">
      <div ref={mountRef} className="h-full w-full [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full [&_canvas:focus-visible]:outline-3 [&_canvas:focus-visible]:outline-ptop-mint-dark [&_canvas:focus-visible]:-outline-offset-5" />
      {loadError && (
        <div className="absolute inset-0 z-10 grid place-content-center justify-items-center gap-3 bg-white/[0.92] text-ptop-ink" role="alert">
          <strong className="text-sm">{loadError}</strong>
          <button className="min-h-11 rounded-md bg-[var(--button-primary-bg)] px-4 font-extrabold text-white transition hover:-translate-y-px"
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
