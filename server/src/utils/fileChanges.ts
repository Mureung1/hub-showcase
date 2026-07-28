import { readJson, writeJson } from "./jsonStore";
import { dataPath } from "./paths";

export interface FileChange {
  path: string;
  changeType: "new" | "modified" | "deleted";
  diff: string;
  suggestedCommitMessage: string;
  // Day 13 will add the actual per-file commit-selection UI that flips this —
  // for now it just gives the "approved / total" progress_pct calc something
  // real to divide, defaulting to 0% until that UI exists.
  approved: boolean;
}

// Kept separate from documents/{step_id}.json rather than reusing that store:
// documents carry a single versioned `content` string with edit history, which
// doesn't fit an array of discrete file entries. A sibling `file-changes/`
// directory matches the existing data/{documents,messages,checklist}/ layout.
function fileChangesPath(stepId: number | string): string {
  return dataPath("file-changes", `${stepId}.json`);
}

export async function getFileChanges(stepId: number | string): Promise<FileChange[]> {
  try {
    return await readJson<FileChange[]>(fileChangesPath(stepId));
  } catch {
    return [];
  }
}

export async function saveFileChanges(
  stepId: number | string,
  files: Array<Omit<FileChange, "approved">>
): Promise<FileChange[]> {
  const withApproved: FileChange[] = files.map((f) => ({ ...f, approved: false }));
  await writeJson(fileChangesPath(stepId), withApproved);
  return withApproved;
}
