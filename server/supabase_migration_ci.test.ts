import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const workflowPath = resolve(
  process.cwd(),
  '.github/workflows/supabase-migration-check.yml'
);

function readWorkflow() {
  return readFileSync(workflowPath, 'utf8');
}

describe('Supabase migration Pull Request 검사', () => {
  it('모든 main 대상 Pull Request에서 필수 검사 상태를 만든다', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('pull_request:');
    expect(workflow).toMatch(/pull_request:\s*\n\s+branches:\s*\n\s+- main/mu);
    expect(workflow).not.toMatch(/^\s+paths:/mu);
    expect(workflow).toContain('Supabase migration validation');
  });

  it('checkout 자격 증명을 후속 단계에 남기지 않는다', () => {
    const workflow = readWorkflow();

    expect(workflow).toMatch(
      /uses: actions\/checkout@[^\r\n]+\r?\n\s{8}with:\r?\n\s{10}fetch-depth: 0\r?\n\s{10}persist-credentials: false/u
    );
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
    expect(workflow).toContain('--version 20260716000000');
    expect(workflow).toContain(
      '--sql-paths upgrade-tests/category_management_fixture.sql'
    );
    expect(workflow).toContain('supabase migration up --local');
    expect(workflow).toContain(
      'supabase/upgrade-tests/category_management.test.sql'
    );
    expect(workflow).toContain('supabase db reset --local');
    expect(workflow).toContain('supabase test db');
    expect(workflow).toContain('supabase stop --no-backup');
  });

  it('검증 도구 버전과 외부 Action을 고정한다', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain(
      'actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0'
    );
    expect(workflow).toContain(
      'supabase/setup-cli@46f7f98c7f948ad727d22c1e67fab04c223a0520'
    );
    expect(workflow).toContain('version: 2.109.1');
  });
});
