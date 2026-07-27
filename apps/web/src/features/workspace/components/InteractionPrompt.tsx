import type { WorkspaceInteraction } from "../model/workspace.types";

type InteractionPromptProps = {
  interaction: WorkspaceInteraction | null;
};

export function InteractionPrompt({ interaction }: InteractionPromptProps) {
  return (
    <div
      className={`absolute bottom-20 left-1/2 z-[6] flex min-h-11 -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-lg border border-white/75 bg-white/90 px-4 py-2.5 text-sm text-ptop-muted shadow-[0_12px_30px_rgb(21_24_23/12%)] transition duration-[var(--motion-fast)] ${interaction ? "translate-y-[-4px] text-ptop-ink opacity-100" : "opacity-80"}`}
      role="status"
      aria-live="polite"
    >
      {interaction ? (
        <>
          <kbd className="rounded bg-ptop-ink px-1.5 py-0.5 font-mono text-xs text-white">E</kbd>
          <span>{interaction.label}</span>
        </>
      ) : (
        <span>컴퓨터 가까이 이동해보세요.</span>
      )}
    </div>
  );
}
