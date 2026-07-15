#!/usr/bin/env node
/* global console, process */

import { verifyCodexInstallation, verifyGeneratedContracts } from './lib/codex-generation.mjs';

async function main() {
  const { codexLauncher, manifest } = await verifyCodexInstallation();
  await verifyGeneratedContracts(codexLauncher, manifest);
  console.log('Verified exact Codex package, lock, binary, and generated protocol fingerprints.');
  console.log('Live Codex behavior was not assessed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
