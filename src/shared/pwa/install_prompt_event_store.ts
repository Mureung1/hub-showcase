export type BeforeInstallPromptUserChoice = Readonly<{
  outcome: 'accepted' | 'dismissed';
  platform: string;
}>;

export type BeforeInstallPromptEvent = Event &
  Readonly<{
    prompt(): Promise<void>;
    userChoice: Promise<BeforeInstallPromptUserChoice>;
  }>;

export type InstallPromptSnapshot = Readonly<{
  installed: boolean;
  prompt: BeforeInstallPromptEvent | undefined;
}>;

export type InstallPromptEventStore = Readonly<{
  discardPrompt(): void;
  getSnapshot(): InstallPromptSnapshot;
  start(target: EventTarget): void;
  subscribe(listener: () => void): () => void;
  takePrompt(): BeforeInstallPromptEvent | undefined;
}>;

export function createInstallPromptEventStore(): InstallPromptEventStore {
  const listeners = new Set<() => void>();
  const startedTargets = new WeakSet<EventTarget>();
  let snapshot: InstallPromptSnapshot = Object.freeze({
    installed: false,
    prompt: undefined,
  });

  function publish(nextSnapshot: InstallPromptSnapshot): void {
    if (
      nextSnapshot.installed === snapshot.installed &&
      nextSnapshot.prompt === snapshot.prompt
    ) {
      return;
    }

    snapshot = Object.freeze(nextSnapshot);
    listeners.forEach((listener) => listener());
  }

  function handleBeforeInstallPrompt(event: Event): void {
    const promptEvent = event as BeforeInstallPromptEvent;
    promptEvent.preventDefault();
    publish({ installed: false, prompt: promptEvent });
  }

  function handleAppInstalled(): void {
    publish({ installed: true, prompt: undefined });
  }

  return {
    discardPrompt(): void {
      publish({ installed: snapshot.installed, prompt: undefined });
    },
    getSnapshot(): InstallPromptSnapshot {
      return snapshot;
    },
    start(target: EventTarget): void {
      if (startedTargets.has(target)) {
        return;
      }

      startedTargets.add(target);
      target.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      target.addEventListener('appinstalled', handleAppInstalled);
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    takePrompt(): BeforeInstallPromptEvent | undefined {
      const prompt = snapshot.prompt;
      if (!prompt) {
        return undefined;
      }

      publish({ installed: snapshot.installed, prompt: undefined });
      return prompt;
    },
  };
}

export const pwaInstallPromptEvents = createInstallPromptEventStore();
