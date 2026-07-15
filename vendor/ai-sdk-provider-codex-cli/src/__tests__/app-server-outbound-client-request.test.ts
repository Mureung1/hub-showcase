import { describe, expect, expectTypeOf, it } from 'vitest';
import type { BuiltOutboundClientRequest } from '../app-server/protocol/outbound-client-request.js';
import { buildGeneratedClientRequest } from '../app-server/protocol/outbound-client-request.js';

describe('generated outbound client requests', () => {
  it('builds all adopted method envelopes from the pinned generated contract', () => {
    const initialize = buildGeneratedClientRequest(1, 'initialize', {
      clientInfo: { name: 'test-client', version: '1.2.3' },
      capabilities: {
        experimentalApi: true,
        optOutNotificationMethods: null,
      },
    });
    const threadStart = buildGeneratedClientRequest(2, 'thread/start', {
      model: null,
      cwd: '/tmp/project',
      approvalPolicy: 'on-request',
      sandbox: 'workspace-write',
      experimentalRawEvents: false,
    });
    const threadResume = buildGeneratedClientRequest(3, 'thread/resume', {
      threadId: 'thr_1',
      path: null,
      approvalPolicy: {
        granular: {
          sandbox_approval: true,
          rules: false,
          skill_approval: true,
          request_permissions: false,
          mcp_elicitations: true,
        },
      },
    });
    const turnStartInput = [
      { type: 'text' as const, text: 'hello', text_elements: [] },
      {
        type: 'image' as const,
        url: 'https://example.test/image.png',
        detail: 'high' as const,
      },
    ];
    const turnStartInputBefore = structuredClone(turnStartInput);
    const turnStart = buildGeneratedClientRequest(4, 'turn/start', {
      threadId: 'thr_1',
      input: turnStartInput,
      approvalPolicy: 'never',
      effort: null,
      outputSchema: null,
    });
    const turnInterrupt = buildGeneratedClientRequest(5, 'turn/interrupt', {
      threadId: 'thr_1',
      turnId: 'turn_1',
    });
    const modelList = buildGeneratedClientRequest(6, 'model/list', {
      cursor: null,
      limit: 0,
      includeHidden: false,
    });

    expect(initialize).toEqual({
      id: 1,
      method: 'initialize',
      params: {
        clientInfo: { name: 'test-client', title: null, version: '1.2.3' },
        capabilities: {
          experimentalApi: true,
          requestAttestation: false,
          optOutNotificationMethods: null,
        },
      },
    });
    expect(threadStart).toEqual({
      id: 2,
      method: 'thread/start',
      params: {
        model: null,
        cwd: '/tmp/project',
        sandbox: 'workspace-write',
        experimentalRawEvents: false,
        approvalPolicy: 'on-request',
      },
    });
    expect(threadResume).toEqual({
      id: 3,
      method: 'thread/resume',
      params: {
        threadId: 'thr_1',
        path: null,
        approvalPolicy: {
          granular: {
            sandbox_approval: true,
            rules: false,
            skill_approval: true,
            request_permissions: false,
            mcp_elicitations: true,
          },
        },
      },
    });
    expect(turnStart).toEqual({
      id: 4,
      method: 'turn/start',
      params: {
        threadId: 'thr_1',
        input: turnStartInput,
        effort: null,
        outputSchema: null,
        approvalPolicy: 'never',
      },
    });
    expect(turnInterrupt).toEqual({
      id: 5,
      method: 'turn/interrupt',
      params: { threadId: 'thr_1', turnId: 'turn_1' },
    });
    expect(modelList).toEqual({
      id: 6,
      method: 'model/list',
      params: {
        cursor: null,
        limit: 0,
        includeHidden: false,
      },
    });
    expect(turnStartInput).toEqual(turnStartInputBefore);
    expectTypeOf(turnStart).toEqualTypeOf<BuiltOutboundClientRequest<'turn/start'>>();
  });

  it('rejects invalid exact-core values without logging request payloads', () => {
    expect(() =>
      buildGeneratedClientRequest(1, 'model/list', {
        limit: -1,
      }),
    ).toThrow("Generated Codex request 'model/list' failed exact schema validation");

    expect(() =>
      buildGeneratedClientRequest(2, 'thread/start', {
        approvalPolicy: 'on-failure',
      } as never),
    ).toThrow("Generated Codex request 'thread/start' failed exact schema validation");
  });

  it('does not emit fields that exist only on the pre-pin donor surface', () => {
    const threadStart = buildGeneratedClientRequest(1, 'thread/start', {
      persistExtendedHistory: false,
    } as never);
    const turnStart = buildGeneratedClientRequest(2, 'turn/start', {
      threadId: 'thr_1',
      input: [
        {
          type: 'image',
          url: 'https://example.test/image.png',
          imageUrl: 'https://example.test/image.png',
        },
      ],
    } as never);
    const modelList = buildGeneratedClientRequest(3, 'model/list', {
      modelProviders: ['openai'],
    } as never);

    expect(threadStart.params).toEqual({});
    expect(turnStart.params).toEqual({
      threadId: 'thr_1',
      input: [{ type: 'image', url: 'https://example.test/image.png' }],
    });
    expect(modelList.params).toEqual({});
  });
});
