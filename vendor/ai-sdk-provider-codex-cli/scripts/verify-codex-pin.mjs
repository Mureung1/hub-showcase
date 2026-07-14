#!/usr/bin/env node
/* global console, process */

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
const packageRoot = resolve(scriptDir, '..');
const manifestPath = join(packageRoot, 'upstream', 'codex-pin.json');
const platformAliases = [
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'win32-arm64',
  'win32-x64',
];

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function assertEqual(actual, expected, label) {
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

function canonicalizeJson(value) {
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

async function listFiles(root, directory = root) {
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

async function fingerprintTree(root, normalization) {
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

async function runCodex(codexLauncher, args, isolatedEnvironment) {
  return execFile(process.execPath, [codexLauncher, ...args], {
    cwd: packageRoot,
    env: isolatedEnvironment,
    maxBuffer: 16 * 1024 * 1024,
    timeout: 30_000,
  });
}

async function verifyGeneratedContracts(codexLauncher, fingerprintManifest) {
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

  const temporaryRoot = await mkdtemp(join(tmpdir(), 'ayple-codex-pin-'));
  const codexHome = join(temporaryRoot, 'codex-home');
  const codexSqliteHome = join(temporaryRoot, 'codex-sqlite-home');
  await mkdir(codexHome);
  await mkdir(codexSqliteHome);
  const isolatedEnvironment = {
    ...process.env,
    CODEX_HOME: codexHome,
    CODEX_SQLITE_HOME: codexSqliteHome,
  };

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
      const expected = expectedOutputs.find(
        (output) => output.surface === surface && output.format === format,
      );
      if (!expected) {
        throw new Error(`missing generated output manifest entry: ${surface}:${format}`);
      }
      assertEqual(expected.normalization, normalization, `${surface}:${format} normalization`);

      const output = join(temporaryRoot, `${surface}-${format}`);
      const args = ['app-server', command];
      if (experimental) args.push('--experimental');
      args.push('--out', output);
      await runCodex(codexLauncher, args, isolatedEnvironment);

      const actual = await fingerprintTree(output, normalization);
      assertEqual(actual.fileCount, expected.fileCount, `${surface}:${format} file count`);
      assertEqual(actual.contentBytes, expected.contentBytes, `${surface}:${format} content bytes`);
      assertEqual(actual.sha256, expected.sha256, `${surface}:${format} fingerprint`);
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function main() {
  const manifest = await readJson(manifestPath);
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
    expectedVersion,
    'lock root dependency',
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

  await verifyGeneratedContracts(codexLauncher, manifest.fingerprint);
  console.log('Verified exact Codex package, lock, binary, and generated protocol fingerprints.');
  console.log('Manual protocol validator compatibility was not assessed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
