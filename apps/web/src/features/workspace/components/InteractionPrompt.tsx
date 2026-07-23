import type { WorkspaceInteraction } from "../model/workspace.types";

type InteractionPromptProps = {
  interaction: WorkspaceInteraction | null;
};

export function InteractionPrompt({ interaction }: InteractionPromptProps) {
  return (
    <div
      className={`workspace-prompt${interaction ? " is-visible" : ""}`}
      role="status"
      aria-live="polite"
    >
      {interaction ? (
        <>
          <kbd>E</kbd>
          <span>{interaction.label}</span>
        </>
      ) : (
        <span>컴퓨터 가까이 이동해보세요.</span>
      )}
    </div>
  );
}
