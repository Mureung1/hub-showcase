// Derives a Step's progress_pct from the markdown checklist items in its
// document (`- [x] ...` / `- [ ] ...`), matching the prototype's document
// format (see docs/GameForge_Agent_Dev_Plan.md §3 checklist/ description).
export function calculateChecklistProgress(content: string): number {
  const matches = content.match(/^[-*]\s+\[[ xX]\]/gm) ?? [];
  if (matches.length === 0) return 0;

  const checked = matches.filter((m) => /\[[xX]\]/.test(m)).length;
  return Math.round((checked / matches.length) * 100);
}
