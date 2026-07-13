import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  BACKUP_FILES,
  RESTORE_ORDER,
  createBackupArchiveName,
  findPlaintextBackupArtifacts,
  parseRetentionDays,
  pruneExpiredEncryptedBackups,
  redactCommandOutput,
  validateAgeRecipient,
} from "./backup-contract.mjs";

const CLI_VERSION = "2.109.1";
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. It is never written to the backup or console.");
}

const arguments_ = parseArguments(process.argv.slice(2));
const recipient = validateAgeRecipient(
  arguments_.recipient || process.env.MODU_BRAIN_AGE_RECIPIENT,
);
const retentionDays = parseRetentionDays(
  arguments_.retentionDays || process.env.MODU_BRAIN_BACKUP_RETENTION_DAYS,
);
const destinationRoot = path.resolve(
  arguments_.destination || ".backups/supabase-encrypted",
);
await mkdir(destinationRoot, { recursive: true, mode: 0o700 });

const preexistingPlaintext = await findPlaintextBackupArtifacts(destinationRoot);
if (preexistingPlaintext.length > 0) {
  throw new Error(
    `Refusing to use a backup destination containing plaintext artifacts: ${preexistingPlaintext.join(", ")}`,
  );
}

const createdAt = new Date();
const archiveName = createBackupArchiveName(createdAt);
const finalArchive = path.join(destinationRoot, archiveName);
const partialArchive = path.join(destinationRoot, `.${archiveName}.${randomUUID()}.partial`);
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "modu-brain-backup-"));
const payloadDirectory = path.join(temporaryRoot, "payload");
const temporaryArchive = path.join(temporaryRoot, "backup.tar");
await mkdir(payloadDirectory, { recursive: true, mode: 0o700 });

let promoted = false;
try {
  const files = Object.fromEntries(
    Object.entries(BACKUP_FILES).map(([name, filename]) => [
      name,
      path.join(payloadDirectory, filename),
    ]),
  );

  runDump(files.roles, ["--role-only"]);
  runDump(files.schema);
  runDump(files.data, ["--data-only", "--use-copy"]);
  runDump(files.migrationHistory, [
    "--data-only",
    "--use-copy",
    "--schema",
    "supabase_migrations",
  ]);

  const checksums = Object.fromEntries(
    await Promise.all(
      Object.entries(files).map(async ([name, file]) => [name, await digest(file)]),
    ),
  );
  const commit = spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).stdout?.trim() || null;
  const manifest = {
    formatVersion: 2,
    createdAt: createdAt.toISOString(),
    supabaseCliVersion: CLI_VERSION,
    sourceCommit: commit,
    encryption: {
      format: "age",
      recipientFingerprint: createHash("sha256").update(recipient).digest("hex").slice(0, 16),
    },
    files: BACKUP_FILES,
    sha256: checksums,
    copyRowCounts: {
      ...await copyRowCounts(files.data),
      ...await copyRowCounts(files.migrationHistory),
    },
    restoreOrder: RESTORE_ORDER,
  };
  await writeFile(
    path.join(payloadDirectory, "backup-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );

  runChecked(process.env.TAR_BIN || "tar", [
    "-cf",
    temporaryArchive,
    "-C",
    payloadDirectory,
    ".",
  ], "tar archive");
  runChecked(process.env.AGE_BIN || "age", [
    "--encrypt",
    "--recipient",
    recipient,
    "--output",
    partialArchive,
    temporaryArchive,
  ], "age encryption");
  await chmod(partialArchive, 0o600);
  await rename(partialArchive, finalArchive);
  promoted = true;

  const removed = await pruneExpiredEncryptedBackups(destinationRoot, {
    retentionDays,
    preserve: [finalArchive],
  });
  const plaintextAfterBackup = await findPlaintextBackupArtifacts(destinationRoot);
  if (plaintextAfterBackup.length > 0) {
    throw new Error("Backup destination contains plaintext after encryption; manual review is required.");
  }

  console.log(`Encrypted backup created: ${finalArchive}`);
  console.log(`Retention: ${retentionDays} days; expired encrypted archives removed: ${removed.length}.`);
} finally {
  if (!promoted) await rm(partialArchive, { force: true }).catch(() => undefined);
  await rm(temporaryRoot, { recursive: true, force: true }).catch(() => undefined);
}

function runDump(file, flags = []) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  runChecked(npx, [
    "--yes",
    `supabase@${CLI_VERSION}`,
    "db",
    "dump",
    "--db-url",
    databaseUrl,
    "--file",
    file,
    ...flags,
  ], "Supabase CLI dump", [databaseUrl]);
}

function runChecked(command, args, label, secrets = []) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error?.code === "ENOENT") {
    throw new Error(`${label} dependency was not found: ${command}`);
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

async function digest(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function copyRowCounts(file) {
  const counts = {};
  let table = null;
  for (const line of (await readFile(file, "utf8")).split(/\r?\n/)) {
    if (!table) {
      const match = /^COPY\s+(?:"?([A-Za-z0-9_]+)"?\.)?"?([A-Za-z0-9_]+)"?\s+\(/.exec(line);
      if (match) {
        table = `${match[1] || "public"}.${match[2]}`;
        counts[table] = 0;
      }
      continue;
    }
    if (line === "\\.") {
      table = null;
      continue;
    }
    counts[table] += 1;
  }
  return counts;
}

function parseArguments(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("-") && !parsed.destination) {
      parsed.destination = argument;
      continue;
    }
    const key = new Map([
      ["--destination", "destination"],
      ["--recipient", "recipient"],
      ["--retention-days", "retentionDays"],
    ]).get(argument);
    if (!key || !args[index + 1]) throw new Error(`Unsupported or incomplete backup argument: ${argument}`);
    parsed[key] = args[index + 1];
    index += 1;
  }
  return parsed;
}
