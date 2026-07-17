import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import {
  pwaInstallPromptEvents,
  type InstallPromptEventStore,
  type InstallPromptSnapshot,
} from '@/shared/pwa';

const INSTALL_NOTICE_STORAGE_KEY = 'amadda.pwa-install-notice.v1';

type NavigatorBrand = Readonly<{
  brand: string;
  version: string;
}>;

export type NavigatorIdentity = Readonly<{
  userAgent: string;
  userAgentData?: Readonly<{
    brands?: readonly NavigatorBrand[];
    platform: string;
  }>;
}>;

type InstallNoticeStorage = Pick<Storage, 'getItem' | 'setItem'>;

export type UsePwaInstallPromptOptions = Readonly<{
  navigatorIdentity?: NavigatorIdentity;
  storage?: InstallNoticeStorage;
  store?: InstallPromptEventStore;
}>;

export type PwaInstallPromptController = Readonly<{
  dismiss(): void;
  install(): Promise<void>;
  isPrompting: boolean;
  isVisible: boolean;
  recordSuccessfulSave(): void;
}>;

export function usePwaInstallPrompt(
  options: UsePwaInstallPromptOptions = {}
): PwaInstallPromptController {
  const store = options.store ?? pwaInstallPromptEvents;
  const storage = useMemo(
    () => options.storage ?? getBrowserStorage(),
    [options.storage]
  );
  const navigatorIdentity = useMemo(
    () => options.navigatorIdentity ?? getBrowserNavigatorIdentity(),
    [options.navigatorIdentity]
  );
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const wasSeen = useMemo(() => readWasSeen(storage), [storage]);
  const hasSuccessfulSaveRef = useRef(false);
  const promptingRef = useRef(false);
  const revealAttemptedRef = useRef(false);
  const browserEligible = useMemo(
    () => isAndroidGoogleChrome(navigatorIdentity),
    [navigatorIdentity]
  );

  const tryReveal = useCallback(
    (nextSnapshot: InstallPromptSnapshot) => {
      const canReveal =
        browserEligible &&
        hasSuccessfulSaveRef.current &&
        Boolean(nextSnapshot.prompt) &&
        !nextSnapshot.installed &&
        !wasSeen &&
        !revealAttemptedRef.current;

      if (!canReveal) {
        return;
      }

      revealAttemptedRef.current = true;
      if (writeSeen(storage)) {
        setIsRevealed(true);
      }
    },
    [browserEligible, storage, wasSeen]
  );

  const subscribe = useCallback(
    (listener: () => void) =>
      store.subscribe(() => {
        tryReveal(store.getSnapshot());
        listener();
      }),
    [store, tryReveal]
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  const isVisible =
    isRevealed &&
    !snapshot.installed &&
    (isPrompting || Boolean(snapshot.prompt));

  const recordSuccessfulSave = useCallback(() => {
    hasSuccessfulSaveRef.current = true;
    tryReveal(store.getSnapshot());
  }, [store, tryReveal]);

  const dismiss = useCallback(() => {
    store.discardPrompt();
    setIsRevealed(false);
  }, [store]);

  const install = useCallback(async () => {
    if (promptingRef.current) {
      return;
    }

    promptingRef.current = true;
    const promptEvent = store.takePrompt();
    if (!promptEvent) {
      promptingRef.current = false;
      setIsRevealed(false);
      return;
    }

    setIsPrompting(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch {
      // 설치 보조 기능 실패가 일반 저장 성공 상태를 바꾸지 않게 격리한다.
    } finally {
      promptingRef.current = false;
      setIsPrompting(false);
      setIsRevealed(false);
    }
  }, [store]);

  return {
    dismiss,
    install,
    isPrompting,
    isVisible,
    recordSuccessfulSave,
  };
}

export function isAndroidGoogleChrome(identity: NavigatorIdentity): boolean {
  if (identity.userAgentData) {
    return (
      identity.userAgentData.platform === 'Android' &&
      (identity.userAgentData.brands?.some(
        ({ brand }) => brand === 'Google Chrome'
      ) ??
        false)
    );
  }

  const userAgent = identity.userAgent;
  const excludedBrowser =
    /SamsungBrowser|EdgA|OPR|Firefox|; wv\b|Version\/4\.0/i;

  return (
    /Android/i.test(userAgent) &&
    /Chrome\//i.test(userAgent) &&
    !excludedBrowser.test(userAgent)
  );
}

function getBrowserNavigatorIdentity(): NavigatorIdentity {
  if (typeof navigator === 'undefined') {
    return { userAgent: '' };
  }

  const browserNavigator = navigator as Navigator & {
    userAgentData?: NavigatorIdentity['userAgentData'];
  };

  return {
    userAgent: browserNavigator.userAgent,
    userAgentData: browserNavigator.userAgentData,
  };
}

function getBrowserStorage(): InstallNoticeStorage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function readWasSeen(storage: InstallNoticeStorage | undefined): boolean {
  if (!storage) {
    return true;
  }

  try {
    return storage.getItem(INSTALL_NOTICE_STORAGE_KEY) === 'seen';
  } catch {
    return true;
  }
}

function writeSeen(storage: InstallNoticeStorage | undefined): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(INSTALL_NOTICE_STORAGE_KEY, 'seen');
    return true;
  } catch {
    return false;
  }
}
