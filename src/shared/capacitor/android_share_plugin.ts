import { Capacitor, registerPlugin } from '@capacitor/core';

import { isNativeAndroid, type CapacitorRuntime } from './runtime';

export type AndroidShareInput = {
  id: string;
  text: string;
  title?: string;
};

export type AndroidShareListenerHandle = {
  remove(): Promise<void>;
};

export type AndroidShareNativePlugin = {
  addListener(
    eventName: 'shareIntentReceived',
    listener: (event: Record<string, unknown>) => void
  ): Promise<AndroidShareListenerHandle>;
  finishShare(): Promise<void>;
  getPendingShare(): Promise<Record<string, unknown>>;
};

export type AndroidSharePluginAdapter = {
  finishShare(): Promise<void>;
  subscribe(
    onShare: (share: AndroidShareInput) => void
  ): Promise<() => Promise<void>>;
};

type AndroidSharePluginDependencies = {
  registerPlugin: (name: string) => AndroidShareNativePlugin;
  runtime: CapacitorRuntime;
};

const defaultDependencies: AndroidSharePluginDependencies = {
  registerPlugin: (name) => registerPlugin<AndroidShareNativePlugin>(name),
  runtime: Capacitor,
};
const RECENT_SHARE_ID_LIMIT = 32;

function parsePendingShare(
  value: Record<string, unknown>
): AndroidShareInput | undefined {
  if (typeof value.id !== 'string' || typeof value.text !== 'string') {
    return undefined;
  }

  if (value.title !== undefined && typeof value.title !== 'string') {
    return undefined;
  }

  return value.title === undefined
    ? { id: value.id, text: value.text }
    : { id: value.id, text: value.text, title: value.title };
}

export function createAndroidSharePluginAdapter(
  dependencies: AndroidSharePluginDependencies = defaultDependencies
): AndroidSharePluginAdapter {
  let nativePlugin: AndroidShareNativePlugin | undefined;

  function getNativePlugin() {
    if (!isNativeAndroid(dependencies.runtime)) {
      return undefined;
    }

    nativePlugin ??= dependencies.registerPlugin('AndroidShare');
    return nativePlugin;
  }

  return {
    async finishShare() {
      await getNativePlugin()?.finishShare();
    },

    async subscribe(onShare) {
      const plugin = getNativePlugin();
      if (!plugin) {
        return async () => undefined;
      }

      let isDisposed = false;
      let pendingPolls = 0;
      let draining: Promise<void> | undefined;
      const deliveredShareIds = new Set<string>();

      const requestDrain = (): Promise<void> => {
        pendingPolls += 1;

        if (!draining) {
          draining = drain();
        }

        return draining;
      };

      const drain = async (): Promise<void> => {
        try {
          while (!isDisposed && pendingPolls > 0) {
            pendingPolls -= 1;
            try {
              const pending = parsePendingShare(await plugin.getPendingShare());

              if (
                !isDisposed &&
                pending &&
                !deliveredShareIds.has(pending.id)
              ) {
                deliveredShareIds.add(pending.id);
                if (deliveredShareIds.size > RECENT_SHARE_ID_LIMIT) {
                  const oldestShareId = deliveredShareIds.values().next().value;
                  if (typeof oldestShareId === 'string') {
                    deliveredShareIds.delete(oldestShareId);
                  }
                }
                onShare(pending);
              }
            } catch {
              pendingPolls = 0;
              break;
            }
          }
        } finally {
          draining = undefined;

          if (!isDisposed && pendingPolls > 0) {
            void requestDrain();
          }
        }
      };

      const listener = await plugin.addListener('shareIntentReceived', () => {
        if (!isDisposed) {
          void requestDrain();
        }
      });

      await requestDrain();

      return async () => {
        isDisposed = true;
        await listener.remove();
      };
    },
  };
}
