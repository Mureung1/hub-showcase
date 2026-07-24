export const ENTRY_MODES = ["direct", "intervention"] as const;
export const GENERATION_SOURCES = [
  "none",
  "gemini",
  "rule_based",
  "history_reuse",
] as const;

export type EntryMode = (typeof ENTRY_MODES)[number];
export type GenerationSource = (typeof GENERATION_SOURCES)[number];

export interface MemoryEvidenceReference {
  sourceDoneEventId: string;
}

export interface MemoryEvidenceSnapshot {
  sourceDoneEventId: string;
  sourceTaskId: string;
  sourceTaskTitle: string;
  sourceTaskType: string;
  sourceCompletedAt: string;
  sourceMicroTask: string | null;
}

export interface DoneContextInput {
  entryMode: EntryMode | null;
  generationSource: GenerationSource | null;
  memoryEvidence: MemoryEvidenceReference | null;
}

export interface MemoryEvidenceSource {
  id: string;
  eventType: string;
  taskId: string;
  occurredAt: Date;
  sourceMicroTask: string | null;
  task: {
    id: string;
    title: string;
    type: string;
  };
}

export class DoneContextValidationError extends Error {
  constructor(
    public readonly code:
      | "invalid_entry_mode"
      | "invalid_generation_source"
      | "invalid_memory_evidence",
    message: string,
  ) {
    super(message);
    this.name = "DoneContextValidationError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function parseOptionalEnum<const T extends readonly string[]>(
  value: unknown,
  values: T,
  code: DoneContextValidationError["code"],
  message: string,
): T[number] | null {
  if (value === undefined || value === null) return null;

  if (typeof value !== "string" || !values.includes(value)) {
    throw new DoneContextValidationError(code, message);
  }

  return value as T[number];
}

function parseMemoryEvidence(value: unknown): MemoryEvidenceReference | null {
  if (value === undefined || value === null) return null;

  if (!isPlainObject(value)) {
    return null;
  }

  const keys = Object.keys(value);
  const sourceDoneEventId = value.sourceDoneEventId;
  if (
    keys.length !== 1 ||
    keys[0] !== "sourceDoneEventId" ||
    typeof sourceDoneEventId !== "string"
  ) {
    return null;
  }

  const normalizedId = sourceDoneEventId.trim();
  if (normalizedId.length === 0 || normalizedId.length > 128) {
    return null;
  }

  return { sourceDoneEventId: normalizedId };
}

export function parseDoneContextInput(body: unknown): DoneContextInput {
  const input = isPlainObject(body) ? body : {};

  return {
    entryMode: parseOptionalEnum(
      input.entryMode,
      ENTRY_MODES,
      "invalid_entry_mode",
      "entryMode는 direct 또는 intervention이어야 합니다.",
    ),
    generationSource: parseOptionalEnum(
      input.generationSource,
      GENERATION_SOURCES,
      "invalid_generation_source",
      "generationSource 값을 확인해주세요.",
    ),
    memoryEvidence: parseMemoryEvidence(input.memoryEvidence),
  };
}

export function buildTrustedMemoryEvidenceSnapshot({
  reference,
  generationSource,
  currentTaskId,
  currentTaskType,
  source,
}: {
  reference: MemoryEvidenceReference | null;
  generationSource: GenerationSource | null;
  currentTaskId: string;
  currentTaskType: string;
  source: MemoryEvidenceSource | null;
}): MemoryEvidenceSnapshot | null {
  if (
    reference === null ||
    (generationSource !== "gemini" &&
      generationSource !== "history_reuse") ||
    source === null ||
    source.id !== reference.sourceDoneEventId ||
    source.eventType !== "done" ||
    source.taskId === currentTaskId ||
    source.task.type !== currentTaskType ||
    source.sourceMicroTask === null
  ) {
    return null;
  }

  return {
    sourceDoneEventId: source.id,
    sourceTaskId: source.task.id,
    sourceTaskTitle: source.task.title,
    sourceTaskType: source.task.type,
    sourceCompletedAt: source.occurredAt.toISOString(),
    sourceMicroTask: source.sourceMicroTask,
  };
}
