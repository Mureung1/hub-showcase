import { createHash } from "node:crypto";
import {
  access,
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  BACKUP_ARCHIVE_PATTERN,
  assertSafeRestoreTarget,
  redactCommandOutput,
  resolveAgeIdentitySource,
  validateArchiveEntries,
  validateBackupManifest,
} from "./backup-contract.mjs";

const destinationUrl = assertSafeRestoreTarget(process.env);
if (!process.argv[2]) throw new Error("Pass the encrypted .tar.age backup as the first argument.");

const encryptedArchive = path.resolve(process.argv[2]);
if (!BACKUP_ARCHIVE_PATTERN.test(path.basename(encryptedArchive))) {
  throw new Error("Restore accepts only a Modu Brain formatVersion 2 .tar.age archive.");
}
await access(encryptedArchive);
const identitySource = resolveAgeIdentitySource(process.env, process.platform);

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "modu-brain-restore-"));
const identityFile = path.join(temporaryRoot, "age-identity.txt");
const temporaryArchive = path.join(temporaryRoot, "backup.tar");
const extractedDirectory = path.join(temporaryRoot, "payload");
await mkdir(extractedDirectory, { recursive: true, mode: 0o700 });

try {
  await materializeIdentity(identitySource, identityFile);
  const identityText = await readFile(identityFile, "utf8");
  if (!/^AGE-SECRET-KEY-1[0-9A-Z]+$/m.test(identityText)) {
    throw new Error("The configured Credential Manager value is not a native age identity.");
  }

  runChecked(process.env.AGE_BIN || "age", [
    "--decrypt",
    "--identity",
    identityFile,
    "--output",
    temporaryArchive,
    encryptedArchive,
  ], "age decryption");
  await rm(identityFile, { force: true });

  const archiveEntries = runChecked(
    process.env.TAR_BIN || "tar",
    ["-tf", temporaryArchive],
    "tar listing",
  );
  validateArchiveEntries(archiveEntries);
  runChecked(process.env.TAR_BIN || "tar", [
    "-xf",
    temporaryArchive,
    "-C",
    extractedDirectory,
  ], "tar extraction");
  await rm(temporaryArchive, { force: true });

  const manifest = validateBackupManifest(
    JSON.parse(await readFile(path.join(extractedDirectory, "backup-manifest.json"), "utf8")),
  );
  for (const name of manifest.restoreOrder) {
    const file = path.join(extractedDirectory, manifest.files[name]);
    await access(file);
    const actual = createHash("sha256").update(await readFile(file)).digest("hex");
    if (actual !== manifest.sha256[name]) {
      throw new Error(`Checksum mismatch for ${manifest.files[name]}. Restore stopped.`);
    }
  }

  const tableCheck =
    "select count(*) from pg_tables where schemaname='public' and tablename = any(array['projects','source_records','analysis_runs','analysis_run_sources','share_links','rate_limit_buckets']);";
  const existingAppTables = Number(
    runPsql(["--tuples-only", "--no-align", "--command", tableCheck]),
  );
  if (existingAppTables > 0) {
    throw new Error("Restore target already contains Modu Brain tables. No changes were made.");
  }

  for (const name of manifest.restoreOrder) {
    runPsql(["--file", path.join(extractedDirectory, manifest.files[name])]);
  }

  const restoredAppTables = Number(
    runPsql(["--tuples-only", "--no-align", "--command", tableCheck]),
  );
  if (restoredAppTables < 6) {
    throw new Error(`Restore finished but only ${restoredAppTables} core tables were found.`);
  }

  for (const [qualifiedName, expected] of Object.entries(manifest.copyRowCounts || {})) {
    const [schema, table] = qualifiedName.split(".");
    if (!/^[A-Za-z0-9_]+$/.test(schema) || !/^[A-Za-z0-9_]+$/.test(table)) {
      throw new Error(`Unsafe table name in backup manifest: ${qualifiedName}`);
    }
    const actual = Number(runPsql([
      "--tuples-only",
      "--no-align",
      "--command",
      `select count(*) from "${schema}"."${table}";`,
    ]));
    if (actual !== expected) {
      throw new Error(
        `Row count mismatch for ${qualifiedName}: expected ${expected}, found ${actual}.`,
      );
    }
  }

  console.log(
    `Restore drill passed: ${restoredAppTables} core tables found; age authentication, checksums, and row counts matched.`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true }).catch(() => undefined);
}

async function materializeIdentity(source, outputFile) {
  if (source.type === "file") {
    await access(source.path);
    await copyFile(source.path, outputFile);
    await chmod(outputFile, 0o600);
    return;
  }
  const helper = path.resolve("scripts/ops/windows-credential.ps1");
  runChecked("powershell.exe", [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    helper,
    "-Action",
    "Get",
    "-Kind",
    "AgeIdentity",
    "-Target",
    source.target,
    "-OutputFile",
    outputFile,
  ], "Windows Credential Manager lookup");
  await access(outputFile);
  await chmod(outputFile, 0o600);
}

function runPsql(args) {
  const environment = { ...process.env, PGDATABASE: destinationUrl };
  delete environment.RESTORE_DATABASE_URL;
  delete environment.DATABASE_URL;
  delete environment.MODU_BRAIN_PRODUCTION_DATABASE_URL;
  return runChecked("psql", ["-X", "--set", "ON_ERROR_STOP=1", ...args], "psql", [
    destinationUrl,
  ], environment);
}

function runChecked(command, args, label, secrets = [], environment = process.env) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: environment,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error?.code === "ENOENT") {
    const detail = command === "psql"
      ? "Install the PostgreSQL 17 client before a restore drill."
      : `Install ${command} before running the restore drill.`;
    throw new Error(`${label} dependency was not found. ${detail}`);
  }
  if (result.status !== 0) {
    const message = redactCommandOutput(
      result.stderr || result.stdout || `${label} failed`,
      secrets,
    );
    throw new Error(message || `${label} failed.`);
  }
  return String(result.stdout || "").trim();
}
