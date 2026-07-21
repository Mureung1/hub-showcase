export type RegisterServiceWorkerOptions = Readonly<{
  enabled?: boolean;
  serviceWorker?: Pick<ServiceWorkerContainer, 'register'>;
}>;

export async function registerServiceWorker(
  options: RegisterServiceWorkerOptions = {}
): Promise<void> {
  const enabled = options.enabled ?? import.meta.env.PROD;
  if (!enabled) {
    return;
  }

  const serviceWorker = Object.hasOwn(options, 'serviceWorker')
    ? options.serviceWorker
    : typeof navigator === 'undefined'
      ? undefined
      : navigator.serviceWorker;
  if (!serviceWorker) {
    return;
  }

  try {
    await serviceWorker.register('/service_worker.js', { scope: '/' });
  } catch {
    // PWA 보조 기능 실패가 일반 웹 저장을 막지 않게 격리한다.
  }
}
