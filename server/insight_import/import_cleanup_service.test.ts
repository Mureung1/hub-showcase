import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@supabase/supabase-js')>();

  return {
    ...actual,
    createClient: supabaseMocks.createClient,
  };
});

import {
  createImportCleanupService,
  createSupabaseImportCleanupService,
} from './import_cleanup_service';

describe('createImportCleanupService', () => {
  it('만료 정리 RPC 결과만 반환한다', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 3, error: null });
    const service = createImportCleanupService({
      rpc,
    } as unknown as SupabaseClient);

    await expect(service.cleanup()).resolves.toEqual({ deletedJobCount: 3 });
    expect(rpc).toHaveBeenCalledWith('cleanup_expired_insight_imports');
  });

  it('RPC 오류 세부를 외부 예외로 전달하지 않는다', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        details: 'SENSITIVE_DATABASE_DETAIL',
        hint: 'SENSITIVE_DATABASE_HINT',
        message: 'SENSITIVE_DATABASE_MESSAGE',
      },
    });
    const service = createImportCleanupService({
      rpc,
    } as unknown as SupabaseClient);

    await expect(service.cleanup()).rejects.toThrow(
      '가져오기 만료 정리에 실패했습니다.'
    );
    await expect(service.cleanup()).rejects.not.toThrow(
      'SENSITIVE_DATABASE_DETAIL'
    );
  });
});

describe('createSupabaseImportCleanupService', () => {
  beforeEach(() => {
    supabaseMocks.createClient.mockReset();
  });

  it('세션을 저장하지 않는 서비스 역할 클라이언트를 만든다', () => {
    supabaseMocks.createClient.mockReturnValue({
      rpc: vi.fn(),
    });

    createSupabaseImportCleanupService({
      serviceRoleKey: 'service-role-key',
      url: 'https://project.supabase.co',
    });

    expect(supabaseMocks.createClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'service-role-key',
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      }
    );
  });
});
