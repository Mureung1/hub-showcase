import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflowPath = resolve(
  process.cwd(),
  '.github/workflows/supabase-migration-check.yml'
);

function readWorkflow() {
  expect(existsSync(workflowPath)).toBe(true);

  if (!existsSync(workflowPath)) {
    return '';
  }

  return readFileSync(workflowPath, 'utf8');
}

describe('Supabase migration Pull Request 검사', () => {
  it('모든 main 대상 Pull Request에서 필수 검사 상태를 만든다', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('pull_request:');
    expect(workflow).not.toMatch(/^\s+paths:/mu);
    expect(workflow).toContain('Supabase migration validation');
  });

  it('Supabase 관련 변경에만 로컬 DB 재구성과 RLS 테스트를 실행한다', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('supabase/');
    expect(workflow).toContain(
      '.github/workflows/supabase-migration-check.yml'
    );
    expect(workflow).toContain(
      "if: steps.changes.outputs.should_run == 'true'"
    );
    expect(workflow).toContain('supabase db start');
    expect(workflow).toContain('supabase test db');
    expect(workflow).toContain('supabase stop --no-backup');
  });

  it('검증 도구 버전과 외부 Action을 고정한다', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain(
      'actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5'
    );
    expect(workflow).toContain(
      'supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520'
    );
    expect(workflow).toContain('version: 2.109.1');
  });
});
