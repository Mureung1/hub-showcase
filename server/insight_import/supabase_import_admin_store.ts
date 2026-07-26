import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { EncryptedToken } from './token_cipher.js';

const SERVER_AUTH_OPTIONS = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: false,
} as const;
const CONNECTION_COLUMNS = [
  'id',
  'user_id',
  'job_id',
  'provider',
  'status',
  'return_mode',
  'include_page_urls',
  'state_hash',
  'state_expires_at',
  'access_ciphertext',
  'access_nonce',
  'access_auth_tag',
  'refresh_ciphertext',
  'refresh_nonce',
  'refresh_auth_tag',
  'key_version',
  'workspace_name',
  'workspace_id',
  'expires_at',
  'created_at',
  'updated_at',
].join(',');
const STORE_FAILURE_MESSAGE = '가져오기 연결 정보를 처리하지 못했습니다.';

export type ConnectionStatus =
  | 'pending'
  | 'exchanging'
  | 'connected'
  | 'analyzing'
  | 'completed'
  | 'canceled'
  | 'failed';

export type CreateConnectionInput = {
  expiresAt: string;
  id: string;
  includePageUrls: boolean;
  jobId: string;
  returnMode: 'android' | 'web';
  stateExpiresAt: string;
  stateHash: string;
  userId: string;
};

export type ConsumedConnection = {
  expiresAt: string;
  id: string;
  includePageUrls: boolean;
  jobId: string;
  provider: 'notion';
  returnMode: 'android' | 'web';
  userId: string;
};

export type EncryptedConnection = {
  accessToken: EncryptedToken | null;
  createdAt: string;
  expiresAt: string;
  id: string;
  includePageUrls: boolean;
  jobId: string;
  provider: 'notion';
  refreshToken: EncryptedToken | null;
  returnMode: 'android' | 'web';
  stateExpiresAt: string;
  stateHash: string;
  status: ConnectionStatus;
  updatedAt: string;
  userId: string;
  workspaceId: string | null;
  workspaceName: string | null;
};

export type StoredEncryptedTokens = {
  accessToken: EncryptedToken;
  refreshToken: EncryptedToken | null;
  workspaceId: string | null;
  workspaceName: string | null;
};

export type ImportAdminStore = {
  consumeState(stateHash: string): Promise<ConsumedConnection | null>;
  createConnection(input: CreateConnectionInput): Promise<void>;
  finishConnection(
    connectionId: string,
    status: 'canceled' | 'completed' | 'failed'
  ): Promise<void>;
  getConnection(connectionId: string): Promise<EncryptedConnection | null>;
  listExpiredConnections(currentTime: string): Promise<EncryptedConnection[]>;
  storeTokens(
    connectionId: string,
    tokens: StoredEncryptedTokens
  ): Promise<void>;
};

export type SupabaseImportAdminStoreConfig = {
  serviceRoleKey: string;
  url: string;
};

export function createSupabaseImportAdminStore(
  config: SupabaseImportAdminStoreConfig
): ImportAdminStore {
  const client = createClient(config.url, config.serviceRoleKey, {
    auth: SERVER_AUTH_OPTIONS,
  });

  return createImportAdminStore(client);
}

export function createImportAdminStore(
  client: Pick<SupabaseClient, 'from' | 'rpc'>
): ImportAdminStore {
  return {
    async consumeState(stateHash) {
      const { data, error } = await client.rpc(
        'consume_insight_import_oauth_state',
        { p_state_hash: stateHash }
      );

      if (error) {
        throw new Error(STORE_FAILURE_MESSAGE);
      }

      return data === null ? null : parseConsumedConnection(data);
    },

    async createConnection(input) {
      const { error } = await client.from('insight_import_connections').insert({
        expires_at: input.expiresAt,
        id: input.id,
        include_page_urls: input.includePageUrls,
        job_id: input.jobId,
        provider: 'notion',
        return_mode: input.returnMode,
        state_expires_at: input.stateExpiresAt,
        state_hash: input.stateHash,
        status: 'pending',
        user_id: input.userId,
      });

      if (error) {
        throw new Error(STORE_FAILURE_MESSAGE);
      }
    },

    async finishConnection(connectionId, status) {
      const { error } = await client.rpc('finish_insight_import_connection', {
        p_connection_id: connectionId,
        p_status: status,
      });

      if (error) {
        throw new Error(STORE_FAILURE_MESSAGE);
      }
    },

    async getConnection(connectionId) {
      const { data, error } = await client
        .from('insight_import_connections')
        .select(CONNECTION_COLUMNS)
        .eq('id', connectionId)
        .maybeSingle();

      if (error) {
        throw new Error(STORE_FAILURE_MESSAGE);
      }

      return data === null ? null : parseEncryptedConnection(data);
    },

    async listExpiredConnections(currentTime) {
      const { data, error } = await client
        .from('insight_import_connections')
        .select(CONNECTION_COLUMNS)
        .lt('expires_at', currentTime)
        .order('expires_at', { ascending: true });

      if (error || !Array.isArray(data)) {
        throw new Error(STORE_FAILURE_MESSAGE);
      }

      return data.map(parseEncryptedConnection);
    },

    async storeTokens(connectionId, tokens) {
      const { error } = await client.rpc('store_insight_import_oauth_tokens', {
        p_connection_id: connectionId,
        p_tokens: {
          accessAuthTag: tokens.accessToken.authTag,
          accessCiphertext: tokens.accessToken.ciphertext,
          accessNonce: tokens.accessToken.nonce,
          keyVersion: tokens.accessToken.keyVersion,
          refreshAuthTag: tokens.refreshToken?.authTag ?? null,
          refreshCiphertext: tokens.refreshToken?.ciphertext ?? null,
          refreshNonce: tokens.refreshToken?.nonce ?? null,
          workspaceId: tokens.workspaceId,
          workspaceName: tokens.workspaceName,
        },
      });

      if (error) {
        throw new Error(STORE_FAILURE_MESSAGE);
      }
    },
  };
}

function parseConsumedConnection(value: unknown): ConsumedConnection {
  if (
    !isRecord(value) ||
    !isUuid(value.id) ||
    !isUuid(value.userId) ||
    !isUuid(value.jobId) ||
    value.provider !== 'notion' ||
    !isReturnMode(value.returnMode) ||
    typeof value.includePageUrls !== 'boolean' ||
    !isDateTime(value.expiresAt)
  ) {
    throw new Error(STORE_FAILURE_MESSAGE);
  }

  return {
    expiresAt: value.expiresAt,
    id: value.id,
    includePageUrls: value.includePageUrls,
    jobId: value.jobId,
    provider: 'notion',
    returnMode: value.returnMode,
    userId: value.userId,
  };
}

function parseEncryptedConnection(value: unknown): EncryptedConnection {
  if (
    !isRecord(value) ||
    !isUuid(value.id) ||
    !isUuid(value.user_id) ||
    !isUuid(value.job_id) ||
    value.provider !== 'notion' ||
    !isConnectionStatus(value.status) ||
    !isReturnMode(value.return_mode) ||
    typeof value.include_page_urls !== 'boolean' ||
    !isStateHash(value.state_hash) ||
    !isDateTime(value.state_expires_at) ||
    !isNullableString(value.workspace_name) ||
    !isNullableString(value.workspace_id) ||
    !isDateTime(value.expires_at) ||
    !isDateTime(value.created_at) ||
    !isDateTime(value.updated_at)
  ) {
    throw new Error(STORE_FAILURE_MESSAGE);
  }

  return {
    accessToken: parseEncryptedToken(value, 'access'),
    createdAt: value.created_at,
    expiresAt: value.expires_at,
    id: value.id,
    includePageUrls: value.include_page_urls,
    jobId: value.job_id,
    provider: 'notion',
    refreshToken: parseEncryptedToken(value, 'refresh'),
    returnMode: value.return_mode,
    stateExpiresAt: value.state_expires_at,
    stateHash: value.state_hash,
    status: value.status,
    updatedAt: value.updated_at,
    userId: value.user_id,
    workspaceId: value.workspace_id,
    workspaceName: value.workspace_name,
  };
}

function parseEncryptedToken(
  value: Record<string, unknown>,
  prefix: 'access' | 'refresh'
) {
  const ciphertext = value[`${prefix}_ciphertext`];
  const nonce = value[`${prefix}_nonce`];
  const authTag = value[`${prefix}_auth_tag`];

  if (ciphertext === null && nonce === null && authTag === null) {
    return null;
  }

  if (
    typeof ciphertext !== 'string' ||
    typeof nonce !== 'string' ||
    typeof authTag !== 'string' ||
    value.key_version !== 1
  ) {
    throw new Error(STORE_FAILURE_MESSAGE);
  }

  return { authTag, ciphertext, keyVersion: 1 as const, nonce };
}

function isConnectionStatus(value: unknown): value is ConnectionStatus {
  return (
    typeof value === 'string' &&
    [
      'pending',
      'exchanging',
      'connected',
      'analyzing',
      'completed',
      'canceled',
      'failed',
    ].includes(value)
  );
}

function isReturnMode(value: unknown): value is 'android' | 'web' {
  return value === 'android' || value === 'web';
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value
    )
  );
}

function isStateHash(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
}

function isDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
