import type {
  ClientRequest,
  ServerNotification,
} from './internal/codex-app-server-protocol/generated/index.js'

export type CodexCapabilitySlotStatus =
  | 'raw-callable'
  | 'schema-confirmed'
  | 'reserved'

export type CodexCapabilitySlot = {
  id: string
  label: string
  category: string
  status: CodexCapabilitySlotStatus
  methods: string[]
  evidence: string[]
  productized: false
  notes: string
}

type GeneratedCodexAppServerMethod =
  | ClientRequest['method']
  | ServerNotification['method']

const capabilitySlots: CodexCapabilitySlot[] = [
  {
    id: 'steering',
    label: 'Turn Steering',
    category: 'steering',
    status: 'raw-callable',
    methods: generatedMethods(['turn/steer']),
    evidence: [
      'generated/ClientRequest.ts: turn/steer',
      'generated/v2/TurnSteerParams.ts',
      'generated/v2/TurnSteerResponse.ts',
      'raw-client.ts: generated-schema-backed raw call wrapper',
    ],
    productized: false,
    notes:
      'Engine inspection slot only; no steer conflict handling or product UX is defined.',
  },
  {
    id: 'thread-session-read',
    label: 'Thread And Session Read',
    category: 'thread-session',
    status: 'raw-callable',
    methods: generatedMethods([
      'thread/list',
      'thread/loaded/list',
      'thread/read',
    ]),
    evidence: [
      'generated/ClientRequest.ts: thread/list, thread/loaded/list, thread/read',
      'generated/v2/ThreadListParams.ts',
      'generated/v2/ThreadLoadedListParams.ts',
      'generated/v2/ThreadReadParams.ts',
      'raw-client.ts: generated-schema-backed read wrappers',
    ],
    productized: false,
    notes:
      'Read-oriented engine inspection only; thread data is not a runtime-core or product contract.',
  },
  {
    id: 'thread-session-lifecycle',
    label: 'Thread Lifecycle',
    category: 'thread-session',
    status: 'reserved',
    methods: generatedMethods(['thread/resume', 'thread/fork', 'thread/archive']),
    evidence: [
      'generated/ClientRequest.ts: thread/resume, thread/fork, thread/archive',
      'generated/v2/ThreadResumeParams.ts',
      'generated/v2/ThreadForkParams.ts',
      'generated/v2/ThreadArchiveParams.ts',
    ],
    productized: false,
    notes:
      'Reserved engine shape; resume, fork, and archive workflows are not productized here.',
  },
  {
    id: 'approval',
    label: 'Approval And Guardian Review',
    category: 'approval',
    status: 'reserved',
    methods: generatedMethods([
      'thread/approveGuardianDeniedAction',
      'item/autoApprovalReview/started',
      'item/autoApprovalReview/completed',
    ]),
    evidence: [
      'generated/ClientRequest.ts: thread/approveGuardianDeniedAction',
      'generated/ServerNotification.ts: item/autoApprovalReview/started, item/autoApprovalReview/completed',
      'generated/v2/ThreadApproveGuardianDeniedActionParams.ts',
      'generated/v2/ItemGuardianApprovalReviewStartedNotification.ts',
      'generated/v2/ItemGuardianApprovalReviewCompletedNotification.ts',
    ],
    productized: false,
    notes:
      'Reserved approval surface; no approval workflow or student-facing review UX is implemented.',
  },
  {
    id: 'profile-settings',
    label: 'Profile And Settings',
    category: 'profile-settings',
    status: 'reserved',
    methods: generatedMethods([
      'permissionProfile/list',
      'config/read',
      'thread/settings/updated',
    ]),
    evidence: [
      'generated/ClientRequest.ts: permissionProfile/list, config/read',
      'generated/ServerNotification.ts: thread/settings/updated',
      'generated/v2/PermissionProfileListParams.ts',
      'generated/v2/ConfigReadParams.ts',
      'generated/v2/ThreadSettings.ts',
      'generated/v2/ActivePermissionProfile.ts',
    ],
    productized: false,
    notes:
      'Reserved configuration visibility; permission/profile settings are not AY-PLE product semantics.',
  },
  {
    id: 'attachment-input',
    label: 'Attachment And Input',
    category: 'attachment-input',
    status: 'reserved',
    methods: generatedMethods([
      'thread/inject_items',
      'fs/readFile',
      'fuzzyFileSearch',
    ]),
    evidence: [
      'generated/ClientRequest.ts: thread/inject_items, fs/readFile, fuzzyFileSearch',
      'generated/v2/ThreadInjectItemsParams.ts',
      'generated/v2/FsReadFileParams.ts',
      'generated/FuzzyFileSearchParams.ts',
    ],
    productized: false,
    notes:
      'Reserved input capability; attachment ingestion, parsing, and SourceSelection wiring are out of scope.',
  },
  {
    id: 'account-profile',
    label: 'Account And Auth Profile',
    category: 'account-profile',
    status: 'reserved',
    methods: generatedMethods(['account/read', 'getAuthStatus']),
    evidence: [
      'generated/ClientRequest.ts: account/read, getAuthStatus',
      'generated/v2/GetAccountParams.ts',
      'generated/GetAuthStatusParams.ts',
    ],
    productized: false,
    notes:
      'Reserved account/auth observation; no account management UX is introduced in this slice.',
  },
]

export function listCodexCapabilitySlots(): CodexCapabilitySlot[] {
  return capabilitySlots.map((slot) => ({
    ...slot,
    methods: [...slot.methods],
    evidence: [...slot.evidence],
  }))
}

function generatedMethods(
  methods: readonly GeneratedCodexAppServerMethod[],
): string[] {
  return [...methods]
}
