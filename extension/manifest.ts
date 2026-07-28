type ManifestOrigins = {
  apiOrigin: string;
  supabaseUrl: string;
};

export function createChromeExtensionManifest({
  apiOrigin,
  supabaseUrl,
}: ManifestOrigins) {
  const hostPermissions = [...new Set([apiOrigin, supabaseUrl])].map(
    (origin) => `${origin}/*`
  );

  return {
    action: {
      default_icon: {
        192: 'icons/amadda-192.png',
      },
      default_title: '현재 탭을 아맞다에 저장',
    },
    background: {
      service_worker: 'background.js',
      type: 'module',
    },
    description: '현재 탭을 저장하고 필요할 때 메모를 남겨요.',
    host_permissions: hostPermissions,
    icons: {
      192: 'icons/amadda-192.png',
      512: 'icons/amadda-512.png',
    },
    manifest_version: 3,
    name: '아맞다',
    permissions: ['activeTab', 'identity', 'notifications', 'storage'],
    version: '0.1.0',
  } as const;
}
