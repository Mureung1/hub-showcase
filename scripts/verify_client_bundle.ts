import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SECRET_KEY_PATTERN = /\bsb_secret_[A-Za-z0-9_-]{8,}\b/gu;
const JWT_PATTERN =
  /\b[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]+\b/gu;
const SECRET_ENV_NAME_PATTERN =
  /(?:SECRET|SERVICE_ROLE|ACCESS_TOKEN|CLIENT_SECRET)/u;

type Environment = Readonly<Record<string, string | undefined>>;

function readJwtRole(value: string) {
  const payload = value.split('.')[1];

  if (!payload) {
    return undefined;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    ) as unknown;

    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'role' in decoded &&
      typeof decoded.role === 'string'
    ) {
      return decoded.role;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function findClientBundleSecrets(
  source: string,
  environment: Environment = {}
) {
  const findings = new Set<string>();

  if (SECRET_KEY_PATTERN.test(source)) {
    findings.add('Supabase secret key');
  }
  SECRET_KEY_PATTERN.lastIndex = 0;

  for (const token of source.match(JWT_PATTERN) ?? []) {
    if (readJwtRole(token) === 'service_role') {
      findings.add('Supabase service_role JWT');
    }
  }

  for (const [name, value] of Object.entries(environment)) {
    if (
      name.startsWith('VITE_') &&
      SECRET_ENV_NAME_PATTERN.test(name) &&
      value &&
      value.length >= 8 &&
      source.includes(value)
    ) {
      findings.add(`환경 변수 ${name}`);
    }
  }

  return [...findings];
}

function listBundleFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);

    return statSync(path).isDirectory() ? listBundleFiles(path) : [path];
  });
}

export function verifyClientBundle(
  outputDirectory: string,
  environment: Environment = process.env
) {
  const violations = listBundleFiles(outputDirectory).flatMap((filePath) => {
    const findings = findClientBundleSecrets(
      readFileSync(filePath, 'utf8'),
      environment
    );

    return findings.map((finding) => `${filePath}: ${finding}`);
  });

  if (violations.length > 0) {
    throw new Error(
      `클라이언트 번들에서 비밀값을 발견했습니다.\n${violations.join('\n')}`
    );
  }
}

const entryPath = process.argv[1];

if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  const outputDirectory = resolve(process.cwd(), process.argv[2] ?? 'dist');

  verifyClientBundle(outputDirectory);
  console.log('클라이언트 번들 비밀값 검사 통과');
}
