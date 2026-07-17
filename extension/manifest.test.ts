import { describe, expect, it } from 'vitest';

import { createChromeExtensionManifest } from './manifest';

describe('createChromeExtensionManifest', () => {
  it('declares only the permissions and hosts needed for one-click capture', () => {
    const manifest = createChromeExtensionManifest({
      apiOrigin: 'https://amadda.example',
      supabaseUrl: 'https://project.supabase.co',
    });

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual([
      'activeTab',
      'identity',
      'notifications',
      'storage',
    ]);
    expect(manifest.host_permissions).toEqual([
      'https://amadda.example/*',
      'https://project.supabase.co/*',
    ]);
    expect(manifest.action).not.toHaveProperty('default_popup');
    expect(manifest.background).toEqual({
      service_worker: 'background.js',
      type: 'module',
    });
    expect(JSON.stringify(manifest)).not.toContain('<all_urls>');
    expect(JSON.stringify(manifest)).not.toContain('scripting');
    expect(JSON.stringify(manifest)).not.toContain('"tabs"');
  });

  it('deduplicates hosts when the API and Supabase share an origin', () => {
    const manifest = createChromeExtensionManifest({
      apiOrigin: 'https://amadda.example',
      supabaseUrl: 'https://amadda.example',
    });

    expect(manifest.host_permissions).toEqual(['https://amadda.example/*']);
  });
});
