#!/usr/bin/env node
/* global console, process */

import { Buffer } from 'node:buffer';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  assertEqual,
  assertFingerprint,
  canonicalizeJson,
  createIsolatedGenerationEnvironment,
  findFingerprintOutput,
  fingerprintTree,
  listFiles,
  packageRoot,
  readJson,
  runCodex,
  verifyCodexInstallation,
} from './lib/codex-generation.mjs';

const trackedRoot = join(packageRoot, 'src', 'app-server', 'protocol', 'generated');
const directions = [
  ['clientRequest', 'ClientRequest'],
  ['clientNotification', 'ClientNotification'],
  ['serverRequest', 'ServerRequest'],
  ['serverNotification', 'ServerNotification'],
];

function parseMode() {
  const [mode, ...rest] = process.argv.slice(2);
  if ((mode !== '--write' && mode !== '--check') || rest.length > 0) {
    throw new Error('Usage: node scripts/generate-codex-protocol.mjs --write|--check');
  }
  return mode;
}

function extractSchemaMethods(schema, label) {
  if (!Array.isArray(schema.oneOf)) {
    throw new Error(`${label} schema does not contain a oneOf method roster`);
  }

  const methods = schema.oneOf.map((variant, index) => {
    const methodEnum = variant?.properties?.method?.enum;
    if (
      !Array.isArray(methodEnum) ||
      methodEnum.length !== 1 ||
      typeof methodEnum[0] !== 'string'
    ) {
      throw new Error(`${label} schema variant ${index} does not contain one literal method`);
    }
    return methodEnum[0];
  });

  const unique = [...new Set(methods)].sort();
  assertEqual(unique.length, methods.length, `${label} unique schema method count`);
  return unique;
}

function extractTypescriptMethods(source, label) {
  const propertyCount = [...source.matchAll(/(?:["']method["']|\bmethod\b)\s*:/g)].length;
  const methods = [...source.matchAll(/(?:["']method["']|\bmethod\b)\s*:\s*(["'])([^"']+)\1/g)].map(
    (match) => match[2],
  );

  assertEqual(methods.length, propertyCount, `${label} literal TypeScript method count`);
  const unique = [...new Set(methods)].sort();
  assertEqual(unique.length, methods.length, `${label} unique TypeScript method count`);
  return unique;
}

async function canonicalizeJsonTree(sourceRoot, targetRoot) {
  for (const file of await listFiles(sourceRoot)) {
    const source = await readJson(join(sourceRoot, file));
    const target = join(targetRoot, file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(canonicalizeJson(source), null, 2)}\n`);
  }
}

async function buildMethodManifest(typesRoot, schemasRoot) {
  const jsonSchema = {};
  const typescriptOnly = {};

  for (const [direction, rootName] of directions) {
    const schemaMethods = extractSchemaMethods(
      await readJson(join(schemasRoot, `${rootName}.json`)),
      rootName,
    );
    const typescriptMethods = extractTypescriptMethods(
      await readFile(join(typesRoot, `${rootName}.ts`), 'utf8'),
      rootName,
    );
    const schemaMethodSet = new Set(schemaMethods);

    jsonSchema[direction] = {
      count: schemaMethods.length,
      methods: schemaMethods,
    };
    typescriptOnly[direction] = typescriptMethods.filter((method) => !schemaMethodSet.has(method));
  }

  return { jsonSchema, typescriptOnly };
}

async function buildExpectedTree(root, codexLauncher, pin) {
  const rawTypes = join(root, 'raw-typescript');
  const rawSchemas = join(root, 'raw-json-schema');
  const expectedRoot = join(root, 'expected');
  const expectedTypes = join(expectedRoot, 'typescript');
  const expectedSchemas = join(expectedRoot, 'json-schema');
  const { environment } = await createIsolatedGenerationEnvironment('ayple-codex-protocol-env-');
  const environmentRoot = dirname(environment.CODEX_HOME);

  try {
    await runCodex(
      codexLauncher,
      ['app-server', 'generate-ts', '--experimental', '--out', rawTypes],
      environment,
    );
    await runCodex(
      codexLauncher,
      ['app-server', 'generate-json-schema', '--experimental', '--out', rawSchemas],
      environment,
    );

    const typesFingerprint = await fingerprintTree(rawTypes, 'raw');
    const schemasFingerprint = await fingerprintTree(
      rawSchemas,
      'json-recursive-object-key-sort-v1',
    );
    const expectedTypesFingerprint = findFingerprintOutput(pin, 'experimental', 'typescript');
    const expectedSchemasFingerprint = findFingerprintOutput(pin, 'experimental', 'json-schema');
    assertFingerprint(typesFingerprint, expectedTypesFingerprint, 'experimental:typescript');
    assertFingerprint(schemasFingerprint, expectedSchemasFingerprint, 'experimental:json-schema');

    await cp(rawTypes, expectedTypes, { recursive: true });
    await canonicalizeJsonTree(rawSchemas, expectedSchemas);

    const methods = await buildMethodManifest(rawTypes, rawSchemas);
    const manifest = {
      schemaVersion: 1,
      codex: {
        package: pin.package.name,
        version: pin.package.version,
        source: pin.source,
      },
      surface: 'experimental',
      generator: {
        typescript: ['app-server', 'generate-ts', '--experimental', '--out', '<output>'],
        jsonSchema: ['app-server', 'generate-json-schema', '--experimental', '--out', '<output>'],
      },
      artifacts: {
        typescript: {
          normalization: 'raw',
          ...typesFingerprint,
        },
        jsonSchema: {
          normalization: 'json-recursive-object-key-sort-v1',
          ...schemasFingerprint,
        },
      },
      methods,
    };
    await writeFile(join(expectedRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

    return expectedRoot;
  } finally {
    await rm(environmentRoot, { recursive: true, force: true });
  }
}

async function compareTrees(expectedRoot, actualRoot) {
  let actualFiles;
  try {
    actualFiles = await listFiles(actualRoot);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new Error('Tracked generated protocol is missing; run npm run generate:codex-protocol');
    }
    throw error;
  }

  const expectedFiles = await listFiles(expectedRoot);
  const expectedSet = new Set(expectedFiles);
  const actualSet = new Set(actualFiles);
  const missing = expectedFiles.filter((file) => !actualSet.has(file));
  const stale = actualFiles.filter((file) => !expectedSet.has(file));
  const changed = [];

  for (const file of expectedFiles) {
    if (!actualSet.has(file)) continue;
    const expected = await readFile(join(expectedRoot, file));
    const actual = await readFile(join(actualRoot, file));
    if (!Buffer.from(expected).equals(actual)) changed.push(file);
  }

  if (missing.length > 0 || stale.length > 0 || changed.length > 0) {
    const render = (label, files) =>
      files.length === 0 ? [] : [`${label}:`, ...files.slice(0, 20).map((file) => `  ${file}`)];
    throw new Error(
      [
        'Tracked generated protocol differs from exact Codex output.',
        ...render('Missing files', missing),
        ...render('Stale files', stale),
        ...render('Changed files', changed),
        'Run npm run generate:codex-protocol and review the full generated diff.',
      ].join('\n'),
    );
  }
}

async function main() {
  const mode = parseMode();
  const { codexLauncher, manifest: pin } = await verifyCodexInstallation();
  const { root } = await createIsolatedGenerationEnvironment('ayple-codex-protocol-');

  try {
    const expectedRoot = await buildExpectedTree(root, codexLauncher, pin);
    if (mode === '--write') {
      await rm(trackedRoot, { recursive: true, force: true });
      await mkdir(dirname(trackedRoot), { recursive: true });
      await cp(expectedRoot, trackedRoot, { recursive: true });
      console.log('Generated exact experimental Codex App Server protocol snapshot.');
    } else {
      await compareTrees(expectedRoot, trackedRoot);
      console.log('Verified exact experimental Codex App Server protocol snapshot.');
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
