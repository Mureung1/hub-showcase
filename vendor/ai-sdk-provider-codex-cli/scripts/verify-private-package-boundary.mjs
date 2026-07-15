#!/usr/bin/env node
/* global console, process */

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import ts from 'typescript';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);
const forbiddenProtocolExports = [
  'JsonRpcId',
  'JsonRpcRequest',
  'JsonRpcResponse',
  'JsonRpcError',
  'JsonRpcErrorResponse',
  'JsonRpcNotification',
  'JsonRpcMessage',
  'Thread',
  'Turn',
  'ThreadItem',
  'UserInput',
  'TurnStartParams',
  'TurnStartResponse',
  'TurnInterruptParams',
  'TurnInterruptResponse',
  'ThreadStartParams',
  'ThreadStartResponse',
  'ThreadResumeParams',
  'ThreadResumeResponse',
  'ThreadStartedNotification',
  'TurnStartedNotification',
  'TurnCompletedNotification',
  'ItemStartedNotification',
  'ItemCompletedNotification',
  'ErrorNotification',
];
const requiredPublicExports = [
  'createCodexAppServer',
  'codexAppServer',
  'createCodexExec',
  'codexExec',
  'listModels',
];
const expectedRuntimeExports = [
  'CodexCliLanguageModel',
  'ExecLanguageModel',
  'UnsupportedFeatureError',
  'codexAppServer',
  'codexCli',
  'codexExec',
  'createCodexAppServer',
  'createCodexCli',
  'createCodexExec',
  'createLocalMcpServer',
  'createSdkMcpServer',
  'isAuthenticationError',
  'isUnsupportedFeatureError',
  'listModels',
  'tool',
];
const expectedPackFiles = [
  'LICENSE',
  'README.md',
  'dist/index.d.ts',
  'dist/index.js',
  'package.json',
  'upstream/openai-codex/LICENSE',
  'upstream/openai-codex/NOTICE',
];

function assertExactRoster(label, actual, expected) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    throw new Error(
      `${label} changed. Expected ${expectedSorted.join(', ')}; received ${actualSorted.join(', ')}`,
    );
  }
}

async function main() {
  const packageJsonPath = resolve(packageRoot, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  if (packageJson.private !== true) {
    throw new Error('The isolated AY-PLE fork package must remain private.');
  }
  if ('publishConfig' in packageJson) {
    throw new Error('The isolated AY-PLE fork package must not declare publishConfig.');
  }

  const declarationPath = resolve(packageRoot, packageJson.types);
  const declaration = await readFile(declarationPath, 'utf8');
  const sourceFile = ts.createSourceFile(
    declarationPath,
    declaration,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const exportedNames = new Set();

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) continue;
    if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) {
      throw new Error('Root declaration must use explicit named exports.');
    }
    for (const element of statement.exportClause.elements) {
      exportedNames.add(element.name.text);
    }
  }

  const leakedProtocolExports = forbiddenProtocolExports.filter((name) => exportedNames.has(name));
  if (leakedProtocolExports.length > 0) {
    throw new Error(
      `Raw handwritten protocol types leaked through the root declaration: ${leakedProtocolExports.join(', ')}`,
    );
  }

  const missingPublicExports = requiredPublicExports.filter((name) => !exportedNames.has(name));
  if (missingPublicExports.length > 0) {
    throw new Error(
      `Expected donor regression exports are missing from the root declaration: ${missingPublicExports.join(', ')}`,
    );
  }

  const runtimeModule = await import(pathToFileURL(resolve(packageRoot, 'dist/index.js')).href);
  assertExactRoster(
    'Root runtime export roster',
    Object.keys(runtimeModule),
    expectedRuntimeExports,
  );

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const { stdout } = await execFileAsync(
    npmCommand,
    ['pack', '--dry-run', '--json', '--ignore-scripts', '--silent'],
    { cwd: packageRoot, maxBuffer: 4 * 1024 * 1024 },
  );
  const reportStart = stdout.lastIndexOf('\n[');
  const packReportJson = reportStart >= 0 ? stdout.slice(reportStart + 1) : stdout;
  const packReport = JSON.parse(packReportJson);
  const packFiles = packReport[0]?.files?.map((file) => file.path);
  if (!Array.isArray(packFiles)) {
    throw new Error('npm pack did not return a file roster.');
  }
  assertExactRoster('Dry-run package file roster', packFiles, expectedPackFiles);

  console.log(
    'Verified private package posture, root exports, and license-inclusive dry-run package roster.',
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
