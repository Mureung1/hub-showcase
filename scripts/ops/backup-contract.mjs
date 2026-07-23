import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

export const BACKUP_ARCHIVE_PATTERN =
  /^modu-brain-supabase-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.tar\.age$/;
export const BACKUP_FILES = Object.freeze({
  roles: "roles.sql",
  schema: "schema.sql",
  data: "data.sql",
  migrationHistory: "migration-history.sql",
});
export const RESTORE_ORDER = Object.freeze([
  "roles",
  "schema",
  "data",
  "migrationHistory",
]);
export const DEFAULT_CREDENTIAL_TARGET = "ModuBrain/SupabaseBackupAgeIdentity";

export function createBackupArchiveName(date = new Date()) {
  const timestamp = date.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  return `modu-brain-supabase-${timestamp}.tar.age`;
}

export function parseRetentionDays(value, fallback = 7) {
  const candidate = value === undefined || value === "" ? fallback : Number(value);
  if (!Number.isInteger(candidate) || candidate < 1 || candidate > 90) {
    throw new Error("Backup retention must be a whole number from 1 to 90 days.");
  }
  return candidate;
}

export function validateAgeRecipient(value) {
  const recipient = String(value || "").trim();
  if (!/^age1[0-9a-z]{20,100}$/.test(recipient)) {
    throw new Error(
      "MODU_BRAIN_AGE_RECIPIENT must be a native age public recipient beginning with age1.",
    );
  }
  return recipient;
}

export function validateArchiveEntries(output) {
  const expected = new Set(["backup-manifest.json", ...Object.values(BACKUP_FILES)]);
  const found = new Set();
  for (const rawEntry of String(output || "").split(/\r?\n/)) {
    const entry = rawEntry.trim().replaceAll("\\", "/").replace(/^\.\//, "");
    if (!entry || entry === ".") continue;
    if (entry.startsWith("/") || entry.split("/").includes("..") || !expected.has(entry)) {
      throw new Error(`Encrypted backup contains an unsafe archive entry: ${entry}`);
    }
    found.add(entry);
  }
  for (const required of expected) {
    if (!found.has(required)) throw new Error(`Encrypted backup is missing ${required}.`);
  }
  return [...found].sort();
}

export function validateBackupManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("Backup manifest must be a JSON object.");
  }
  if (manifest.formatVersion !== 2 || manifest.encryption?.format !== "age") {
    throw new Error("Unsupported backup format. An age-encrypted formatVersion 2 backup is required.");
  }
  if (JSON.stringify(manifest.restoreOrder) !== JSON.stringify(RESTORE_ORDER)) {
    throw new Error("Backup manifest restore order is invalid.");
  }
  for (const name of RESTORE_ORDER) {
    if (manifest.files?.[name] !== BACKUP_FILES[name]) {
      throw new Error(`Backup manifest has an invalid ${name} filename.`);
    }
    if (!/^[0-9a-f]{64}$/.test(String(manifest.sha256?.[name] || ""))) {
      throw new Error(`Backup manifest has an invalid ${name} checksum.`);
    }
  }
  return manifest;
}

export function resolveAgeIdentitySource(env = process.env, platform = process.platform) {
  const identityFile = String(env.MODU_BRAIN_AGE_IDENTITY_FILE || "").trim();
  if (identityFile) {
    if (String(env.MODU_BRAIN_ALLOW_IDENTITY_FILE || "").toLowerCase() !== "true") {
      throw new Error(
        "Identity-file restore is disabled. Use Windows Credential Manager or explicitly set MODU_BRAIN_ALLOW_IDENTITY_FILE=true for an isolated CI drill.",
      );
    }
    return { type: "file", path: path.resolve(identityFile) };
  }
  if (platform !== "win32") {
    throw new Error(
      "Non-Windows restore drills require MODU_BRAIN_AGE_IDENTITY_FILE and MODU_BRAIN_ALLOW_IDENTITY_FILE=true.",
    );
  }
  const target = String(env.MODU_BRAIN_AGE_CREDENTIAL_TARGET || DEFAULT_CREDENTIAL_TARGET).trim();
  if (!/^[A-Za-z0-9 ._:/-]{1,128}$/.test(target)) {
    throw new Error("MODU_BRAIN_AGE_CREDENTIAL_TARGET contains unsupported characters.");
  }
  return { type: "windows-credential", target };
}

export function assertSafeRestoreTarget(env = process.env) {
  const destinationUrl = String(env.RESTORE_DATABASE_URL || "").trim();
  if (!destinationUrl) throw new Error("RESTORE_DATABASE_URL is required.");
  if (env.CONFIRM_RESTORE_TARGET !== "empty-target") {
    throw new Error("Set CONFIRM_RESTORE_TARGET=empty-target after verifying the target is disposable.");
  }
  if (String(env.RESTORE_TARGET_ENVIRONMENT || "").toLowerCase() === "production") {
    throw new Error("Refusing to restore into a target marked as production.");
  }

  const destination = parsePostgresUrl(destinationUrl, "RESTORE_DATABASE_URL");
  for (const [name, candidate] of [
    ["DATABASE_URL", env.DATABASE_URL],
    ["MODU_BRAIN_PRODUCTION_DATABASE_URL", env.MODU_BRAIN_PRODUCTION_DATABASE_URL],
  ]) {
    if (!String(candidate || "").trim()) continue;
    const protectedDatabase = parsePostgresUrl(candidate, name);
    if (databaseIdentity(protectedDatabase) === databaseIdentity(destination)) {
      throw new Error(`Refusing to restore into ${name}. Use a separate empty verification database.`);
    }
  }

  if (isLocalDatabase(destination)) return destinationUrl;
  if (
    String(env.RESTORE_TARGET_ENVIRONMENT || "").toLowerCase() !== "staging" ||
    String(env.ALLOW_REMOTE_RESTORE_DRILL || "").toLowerCase() !== "true"
  ) {
    throw new Error(
      "Remote restore drills require RESTORE_TARGET_ENVIRONMENT=staging and ALLOW_REMOTE_RESTORE_DRILL=true.",
    );
  }
  if (!String(env.MODU_BRAIN_PRODUCTION_DATABASE_URL || "").trim()) {
    throw new Error(
      "Remote restore drills require MODU_BRAIN_PRODUCTION_DATABASE_URL so the production target can be rejected explicitly.",
    );
  }
  return destinationUrl;
}

export async function findPlaintextBackupArtifacts(root) {
  const artifacts = [];
  await visit(path.resolve(root));
  return artifacts.sort();

  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const candidate = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await visit(candidate);
        continue;
      }
      if (
        /\.sql$/i.test(entry.name) ||
        /\.tar$/i.test(entry.name) ||
        entry.name === "backup-manifest.json"
      ) {
        artifacts.push(candidate);
      }
    }
  }
}

export async function pruneExpiredEncryptedBackups(
  root,
  { retentionDays = 7, now = Date.now(), preserve = [] } = {},
) {
  const keep = new Set(preserve.map((file) => path.resolve(file)));
  const cutoff = now - parseRetentionDays(retentionDays) * 24 * 60 * 60 * 1_000;
  const removed = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return removed;
    throw error;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !BACKUP_ARCHIVE_PATTERN.test(entry.name)) continue;
    const candidate = path.resolve(root, entry.name);
    if (keep.has(candidate)) continue;
    const metadata = await stat(candidate);
    if (metadata.mtimeMs >= cutoff) continue;
    await rm(candidate, { force: true });
    removed.push(candidate);
  }
  return removed.sort();
}

export function redactCommandOutput(value, secrets = []) {
  let message = String(value || "");
  for (const secret of secrets) {
    const candidate = String(secret || "");
    if (candidate) message = message.replaceAll(candidate, "[REDACTED]");
  }
  return message.trim();
}

function parsePostgresUrl(value, name) {
  try {
    const parsed = new URL(String(value));
    if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) throw new Error();
    return parsed;
  } catch {
    throw new Error(`${name} must be a valid postgres:// or postgresql:// URL.`);
  }
}

function databaseIdentity(url) {
  return [
    url.protocol.toLowerCase(),
    url.hostname.toLowerCase(),
    url.port || "5432",
    decodeURIComponent(url.username).toLowerCase(),
    url.pathname.replace(/\/+$/, "").toLowerCase(),
  ].join("|");
}

function isLocalDatabase(url) {
  const hostname = url.hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
