import { describe, it, expect } from 'vitest';
import { validateAppServerSettings } from '../validation.js';

describe('validateAppServerSettings', () => {
  it('accepts app-server settings', () => {
    const res = validateAppServerSettings({
      codexPath: '/opt/homebrew/bin/codex',
      personality: 'pragmatic',
      minCodexVersion: '0.142.5',
      sandboxPolicy: 'workspace-write',
    });
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('accepts only exact-pin app-server approval policies', () => {
    expect(
      validateAppServerSettings({
        approvalPolicy: {
          granular: {
            sandbox_approval: true,
            rules: false,
            skill_approval: true,
            request_permissions: false,
            mcp_elicitations: true,
          },
        },
      }).valid,
    ).toBe(true);

    for (const approvalPolicy of [
      'on-failure',
      { reject: { sandbox_approval: true, rules: false, mcp_elicitations: true } },
    ]) {
      expect(validateAppServerSettings({ approvalPolicy } as never).valid).toBe(false);
    }
  });

  it('rejects removed pre-pin app-server settings', () => {
    expect(validateAppServerSettings({ persistExtendedHistory: false } as never).valid).toBe(false);
    expect(
      validateAppServerSettings({
        serverRequests: { onSkillApproval: async () => ({ decision: 'approve' }) },
      } as never).valid,
    ).toBe(false);
  });

  it('rejects invalid app-server minCodexVersion', () => {
    const res = validateAppServerSettings({
      minCodexVersion: 'bad-version',
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /minCodexVersion/i.test(e))).toBe(true);
  });

  it('accepts app-server serverRequests object', () => {
    const res = validateAppServerSettings({
      serverRequests: {
        onDynamicToolCall: async () => ({ contentItems: [], success: true }),
      },
      threadMode: 'persistent',
      requestTimeoutMs: 10_000,
      includeRawChunks: true,
    });
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('accepts onMcpElicitation in app-server serverRequests', () => {
    const res = validateAppServerSettings({
      serverRequests: {
        onMcpElicitation: async () => ({ action: 'accept', content: {} }),
      },
    });
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('rejects invalid app-server serverRequests values', () => {
    const res = validateAppServerSettings({
      serverRequests: {
        onDynamicToolCall: 'not-a-function',
      },
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /onDynamicToolCall/i.test(e))).toBe(true);
  });

  it('rejects deprecated app-server aliases', () => {
    const res = validateAppServerSettings({
      approvalMode: 'on-failure' as never,
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /approvalMode/i.test(e))).toBe(true);
  });

  it('rejects invalid mcp server names', () => {
    const res = validateAppServerSettings({
      mcpServers: {
        'bad.name': {
          transport: 'stdio',
          command: 'node',
        },
      },
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /mcpServers\.bad\.name/i.test(e))).toBe(true);
  });

  it('rejects mcp server names containing equals', () => {
    const res = validateAppServerSettings({
      mcpServers: {
        'a=b': {
          transport: 'stdio',
          command: 'node',
        },
      },
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /mcpServers\.a=b/i.test(e))).toBe(true);
  });

  it('rejects mcp server names with surrounding whitespace', () => {
    const res = validateAppServerSettings({
      mcpServers: {
        ' local ': {
          transport: 'stdio',
          command: 'node',
        },
      },
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /mcpServers\..*local/i.test(e))).toBe(true);
  });

  it('rejects invalid configOverrides keys', () => {
    const res = validateAppServerSettings({
      configOverrides: {
        'bad=key': 'value',
      },
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /configOverrides\.bad=key/i.test(e))).toBe(true);
  });

  it('rejects configOverrides keys with empty path segments', () => {
    const res = validateAppServerSettings({
      configOverrides: {
        'x..y': 'value',
      },
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /configOverrides\.x\.\.y/i.test(e))).toBe(true);
  });

  it('rejects configOverrides keys containing newlines', () => {
    const res = validateAppServerSettings({
      configOverrides: {
        'key\ninjection': 'value',
      },
    });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => /configOverrides[\s\S]*injection/i.test(e))).toBe(true);
  });
});
