const SESSION_STORAGE_KEY = "emotion-analysis-session-id";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let inMemorySessionId;

function createSessionId() {
  return window.crypto.randomUUID();
}

export function getOrCreateBrowserSessionId() {
  if (inMemorySessionId) return inMemorySessionId;

  try {
    const storedSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);

    if (storedSessionId && UUID_PATTERN.test(storedSessionId)) {
      inMemorySessionId = storedSessionId;
      return inMemorySessionId;
    }

    inMemorySessionId = createSessionId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, inMemorySessionId);
    return inMemorySessionId;
  } catch {
    inMemorySessionId = createSessionId();
    return inMemorySessionId;
  }
}

export function buildMessagesFromEmotionAnalyses(records) {
  return [...records]
    .reverse()
    .flatMap((record) => [
      {
        id: `stored-${record.id}-user`,
        role: "user",
        content: record.situationText
      },
      {
        id: `stored-${record.id}-ai`,
        role: "ai",
        content: record.aiResponse
      }
    ]);
}
