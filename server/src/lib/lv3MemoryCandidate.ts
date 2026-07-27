import { prisma } from "../db/client.js";

const MAX_CANDIDATES_TO_SCAN = 25;
const MAX_STORED_MICROTASK_CHARS = 60;

export interface Lv3MemoryCandidate {
  sourceDoneEventId: string;
  sourceTaskTitle: string;
  sourceMicroTask: string;
}

export interface Lv3MemoryContext {
  currentTask: {
    id: string;
    title: string;
    type: string;
  };
  candidate: Lv3MemoryCandidate | null;
}

interface DoneEventCandidate {
  id: string;
  taskId: string;
  occurredAt: Date;
  microTask: string | null;
  task: {
    title: string;
    type: string;
  };
}

function unicodeLength(value: string): number {
  return [...value].length;
}

export function normalizeStoredMicroTask(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[ \t]+/g, " ");
  if (
    normalized.length === 0 ||
    unicodeLength(normalized) > MAX_STORED_MICROTASK_CHARS ||
    /[\r\n]/.test(normalized) ||
    /^(?:[-*•]\s+|\d+[.)]\s*)/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function selectLatestValidLv3Candidate(
  events: DoneEventCandidate[],
  currentTaskId: string,
  currentTaskType: string,
): Lv3MemoryCandidate | null {
  const sorted = [...events].sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
  );

  for (const event of sorted) {
    if (
      event.taskId === currentTaskId ||
      event.task.type !== currentTaskType
    ) {
      continue;
    }
    const sourceMicroTask = normalizeStoredMicroTask(event.microTask);
    if (!sourceMicroTask) continue;

    return {
      sourceDoneEventId: event.id,
      sourceTaskTitle: event.task.title,
      sourceMicroTask,
    };
  }

  return null;
}

export async function findLv3MemoryContext(
  taskId: string,
): Promise<Lv3MemoryContext | null> {
  const currentTask = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, type: true },
  });
  if (!currentTask) return null;

  const events = await prisma.taskEvent.findMany({
    where: {
      eventType: "done",
      taskId: { not: taskId },
      microTask: { not: null },
      task: { is: { type: currentTask.type } },
    },
    orderBy: { occurredAt: "desc" },
    take: MAX_CANDIDATES_TO_SCAN,
    select: {
      id: true,
      taskId: true,
      occurredAt: true,
      microTask: true,
      task: {
        select: {
          title: true,
          type: true,
        },
      },
    },
  });

  return {
    currentTask,
    candidate: selectLatestValidLv3Candidate(
      events,
      currentTask.id,
      currentTask.type,
    ),
  };
}
