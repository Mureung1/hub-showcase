/* global process */

import { execFile as execFileCallback } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const scriptDir = dirname(fileURLToPath(import.meta.url));

export const packageRoot = resolve(scriptDir, '..', '..');
export const codexPinManifestPath = join(packageRoot, 'upstream', 'codex-pin.json');

const platformAliases = [
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'win32-arm64',
  'win32-x64',
];

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertExactKeys(actual, expected, label) {
  assertEqual(
    JSON.stringify(Object.keys(actual ?? {}).sort()),
    JSON.stringify([...expected].sort()),
    `${label} keys`,
  );
}

export function canonicalizeJson(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalizeJson(value[key])]),
    );
  }
  return value;
}

export async function listFiles(root, directory = root) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, path)));
    } else if (entry.isFile()) {
      files.push(relative(root, path).split(sep).join('/'));
    } else {
      throw new Error(`generated output contains unsupported entry: ${path}`);
    }
  }
  return files.sort();
}

export async function fingerprintTree(root, normalization) {
  const files = await listFiles(root);
  const hash = createHash('sha256');
  let contentBytes = 0;

  for (const file of files) {
    const raw = await readFile(join(root, file));
    const content =
      normalization === 'json-recursive-object-key-sort-v1'
        ? Buffer.from(JSON.stringify(canonicalizeJson(JSON.parse(raw.toString('utf8')))))
        : raw;
    contentBytes += content.length;
    hash.update(file);
    hash.update('\0');
    hash.update(String(content.length));
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }

  return {
    fileCount: files.length,
    contentBytes,
    sha256: hash.digest('hex'),
  };
}

export async function runCodex(codexLauncher, args, environment) {
  return execFile(process.execPath, [codexLauncher, ...args], {
    cwd: packageRoot,
    env: environment,
    maxBuffer: 16 * 1024 * 1024,
    timeout: 30_000,
  });
}

export async function createIsolatedGenerationEnvironment(prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  const codexHome = join(root, 'codex-home');
  const codexSqliteHome = join(root, 'codex-sqlite-home');
  await mkdir(codexHome);
  await mkdir(codexSqliteHome);

  return {
    root,
    environment: {
      ...process.env,
      CODEX_HOME: codexHome,
      CODEX_SQLITE_HOME: codexSqliteHome,
    },
  };
}

export function findFingerprintOutput(manifest, surface, format) {
  return manifest.fingerprint.outputs.find(
    (output) => output.surface === surface && output.format === format,
  );
}

export function assertFingerprint(actual, expected, label) {
  if (!expected) {
    throw new Error(`missing generated output manifest entry: ${label}`);
  }
  assertEqual(actual.fileCount, expected.fileCount, `${label} file count`);
  assertEqual(actual.contentBytes, expected.contentBytes, `${label} content bytes`);
  assertEqual(actual.sha256, expected.sha256, `${label} fingerprint`);
}

export async function verifyCodexInstallation() {
  const manifest = await readJson(codexPinManifestPath);
  const packageJson = await readJson(join(packageRoot, 'package.json'));
  const packageLock = await readJson(join(packageRoot, 'package-lock.json'));
  const expectedPackage = manifest.package;
  const expectedVersion = expectedPackage.version;

  assertEqual(manifest.schemaVersion, 1, 'codex pin manifest schemaVersion');
  assertEqual(expectedPackage.name, '@openai/codex', 'codex pin package name');
  assertEqual(packageJson.dependencies?.['@openai/codex'], undefined, 'package regular dependency');
  assertEqual(
    packageJson.optionalDependencies?.['@openai/codex'],
    expectedVersion,
    'package optional dependency',
  );
  assertEqual(
    packageLock.packages?.['']?.dependencies?.['@openai/codex'],
    undefined,
    'lock root regular dependency',
  );
  assertEqual(
    packageLock.packages?.['']?.optionalDependencies?.['@openai/codex'],
    expectedVersion,
    'lock root optional dependency',
  );

  const lockedCodex = packageLock.packages?.['node_modules/@openai/codex'];
  assertEqual(lockedCodex?.version, expectedVersion, 'locked Codex package version');
  assertEqual(lockedCodex?.resolved, expectedPackage.resolved, 'locked Codex package tarball');
  assertEqual(lockedCodex?.integrity, expectedPackage.integrity, 'locked Codex package integrity');

  const expectedAliasNames = platformAliases.map((platform) => `@openai/codex-${platform}`);
  assertExactKeys(lockedCodex?.optionalDependencies, expectedAliasNames, 'Codex platform aliases');
  for (const platform of platformAliases) {
    const alias = `@openai/codex-${platform}`;
    assertEqual(
      lockedCodex.optionalDependencies[alias],
      `npm:@openai/codex@${expectedVersion}-${platform}`,
      `${alias} lock specifier`,
    );
    const lockedPlatform = packageLock.packages?.[`node_modules/${alias}`];
    assertEqual(
      lockedPlatform?.version,
      `${expectedVersion}-${platform}`,
      `${alias} locked package version`,
    );
  }

  const installedPackagePath = join(
    packageRoot,
    'node_modules',
    '@openai',
    'codex',
    'package.json',
  );
  const installedPackage = await readJson(installedPackagePath);
  assertEqual(installedPackage.version, expectedVersion, 'installed Codex package version');

  const codexLauncher = join(dirname(installedPackagePath), 'bin', 'codex.js');
  const { stdout } = await runCodex(codexLauncher, ['--version'], process.env);
  assertEqual(stdout.trim(), manifest.binaryVersion, 'Codex binary version');

  return { codexLauncher, manifest };
}

export async function verifyGeneratedContracts(codexLauncher, manifest) {
  const fingerprintManifest = manifest.fingerprint;
  assertEqual(
    fingerprintManifest.algorithm,
    'sha256-path-length-content-v1',
    'fingerprint algorithm',
  );

  const expectedOutputs = fingerprintManifest.outputs ?? [];
  const outputKeys = expectedOutputs.map(({ surface, format }) => `${surface}:${format}`);
  assertEqual(outputKeys.length, 4, 'generated output manifest entry count');
  assertEqual(new Set(outputKeys).size, 4, 'unique generated output manifest entries');
  assertExactKeys(
    Object.fromEntries(outputKeys.map((key) => [key, true])),
    [
      'stable:typescript',
      'experimental:typescript',
      'stable:json-schema',
      'experimental:json-schema',
    ],
    'generated output manifest',
  );

  const { root, environment } = await createIsolatedGenerationEnvironment('ayple-codex-pin-');

  try {
    const variants = [
      ['stable', 'typescript', 'generate-ts', false, 'raw'],
      ['experimental', 'typescript', 'generate-ts', true, 'raw'],
      ['stable', 'json-schema', 'generate-json-schema', false, 'json-recursive-object-key-sort-v1'],
      [
        'experimental',
        'json-schema',
        'generate-json-schema',
        true,
        'json-recursive-object-key-sort-v1',
      ],
    ];

    for (const [surface, format, command, experimental, normalization] of variants) {
      const expected = findFingerprintOutput(manifest, surface, format);
      if (!expected) {
        throw new Error(`missing generated output manifest entry: ${surface}:${format}`);
      }
      assertEqual(expected.normalization, normalization, `${surface}:${format} normalization`);

      const output = join(root, `${surface}-${format}`);
      const args = ['app-server', command];
      if (experimental) args.push('--experimental');
      args.push('--out', output);
      await runCodex(codexLauncher, args, environment);

      const actual = await fingerprintTree(output, normalization);
      assertFingerprint(actual, expected, `${surface}:${format}`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
