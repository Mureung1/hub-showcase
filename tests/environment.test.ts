import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createAnonClient, createServiceRoleClient } from './helpers/supabaseClient';

/**
 * Environment sanity checks for the foundation task.
 *
 * These do NOT hit a live database. They verify that the TypeScript test
 * toolchain (Vitest + fast-check + supabase-js) is wired up correctly, so
 * later tasks can add real property-based tests against a running Supabase
 * instance. The money/point integrity properties (Requirements 14.1-14.3)
 * will be implemented on top of this infrastructure.
 */
describe('test environment', () => {
  it('runs fast-check property-based tests', () => {
    // A trivial property just to confirm the runner and fast-check integrate.
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      }),
    );
  });

  it('exposes the supabase client helpers and validates configuration', () => {
    // With no Supabase env vars configured, the helpers should fail loudly
    // rather than silently building a client pointed at nowhere.
    const original = {
      url: process.env.SUPABASE_URL,
      anon: process.env.SUPABASE_ANON_KEY,
      service: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    try {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => createAnonClient()).toThrow(/SUPABASE_URL/);
      expect(() => createServiceRoleClient()).toThrow(/SUPABASE_URL/);
    } finally {
      // Restore any values that were present so other tests are unaffected.
      if (original.url !== undefined) process.env.SUPABASE_URL = original.url;
      if (original.anon !== undefined) process.env.SUPABASE_ANON_KEY = original.anon;
      if (original.service !== undefined) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = original.service;
      }
    }
  });
});
