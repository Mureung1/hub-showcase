const NOTION_ENVIRONMENT_KEYS = [
  'IMPORT_APP_ORIGIN',
  'IMPORT_TOKEN_ENCRYPTION_KEY',
  'NOTION_CLIENT_ID',
  'NOTION_CLIENT_SECRET',
  'NOTION_REDIRECT_URI',
] as const;
const FORBIDDEN_BROWSER_SECRET_KEYS = [
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_NOTION_CLIENT_SECRET',
  'VITE_IMPORT_TOKEN_ENCRYPTION_KEY',
  'VITE_CRON_SECRET',
] as const;

export type NotionImportServerConfig = {
  appOrigin: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenEncryptionKey: string;
};

export type ImportServerConfig = {
  cronSecret: string;
  notion?: NotionImportServerConfig;
  serviceRoleKey: string;
};

export function readImportServerConfig(
  environment: Record<string, string | undefined>
): ImportServerConfig | null {
  rejectBrowserSecrets(environment);

  const cronSecret = readValue(environment, 'CRON_SECRET');
  const serviceRoleKey = readValue(environment, 'SUPABASE_SERVICE_ROLE_KEY');
  const hasNotionSetting = NOTION_ENVIRONMENT_KEYS.some((key) =>
    Boolean(readValue(environment, key))
  );

  if (!cronSecret && !hasNotionSetting) {
    return null;
  }

  if (!cronSecret) {
    throw new Error('CRON_SECRET is required');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  }

  if (!hasNotionSetting) {
    return { cronSecret, serviceRoleKey };
  }

  const appOrigin = requireValue(environment, 'IMPORT_APP_ORIGIN');
  const tokenEncryptionKey = requireValue(
    environment,
    'IMPORT_TOKEN_ENCRYPTION_KEY'
  );
  const clientId = requireValue(environment, 'NOTION_CLIENT_ID');
  const clientSecret = requireValue(environment, 'NOTION_CLIENT_SECRET');
  const redirectUri = requireValue(environment, 'NOTION_REDIRECT_URI');

  assertEncryptionKey(tokenEncryptionKey);

  return {
    cronSecret,
    notion: {
      appOrigin: readSecureUrl(
        'IMPORT_APP_ORIGIN',
        appOrigin,
        environment.NODE_ENV,
        true
      ),
      clientId,
      clientSecret,
      redirectUri: readSecureUrl(
        'NOTION_REDIRECT_URI',
        redirectUri,
        environment.NODE_ENV,
        false
      ),
      tokenEncryptionKey,
    },
    serviceRoleKey,
  };
}

function rejectBrowserSecrets(environment: Record<string, string | undefined>) {
  for (const key of FORBIDDEN_BROWSER_SECRET_KEYS) {
    if (readValue(environment, key)) {
      throw new Error(`${key} must not be exposed to the browser`);
    }
  }
}

function assertEncryptionKey(value: string) {
  const decoded = Buffer.from(value, 'base64');

  if (decoded.byteLength !== 32) {
    throw new Error('IMPORT_TOKEN_ENCRYPTION_KEY must decode to 32 bytes');
  }
}

function readSecureUrl(
  name: string,
  value: string,
  nodeEnvironment: string | undefined,
  originOnly: boolean
) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  const isDevelopmentLocalhost =
    nodeEnvironment === 'development' &&
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1');

  if (url.protocol !== 'https:' && !isDevelopmentLocalhost) {
    throw new Error(`${name} must use HTTPS`);
  }

  if (
    originOnly &&
    (url.pathname !== '/' ||
      url.search ||
      url.hash ||
      url.username ||
      url.password)
  ) {
    throw new Error(`${name} must be an origin`);
  }

  return originOnly ? url.origin : url.toString();
}

function requireValue(
  environment: Record<string, string | undefined>,
  name: string
) {
  const value = readValue(environment, name);

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function readValue(
  environment: Record<string, string | undefined>,
  name: string
) {
  return environment[name]?.trim();
}
