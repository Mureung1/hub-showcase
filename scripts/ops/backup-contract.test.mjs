// @vitest-environment node

import { mkdtemp, mkdir, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  BACKUP_FILES,
  DEFAULT_CREDENTIAL_TARGET,
  RESTORE_ORDER,
  assertSafeRestoreTarget,
  createBackupArchiveName,
  findPlaintextBackupArtifacts,
  parseRetentionDays,
  pruneExpiredEncryptedBackups,
  redactCommandOutput,
  resolveAgeIdentitySource,
  validateAgeRecipient,
  validateArchiveEntries,
  validateBackupManifest,
} from "./backup-contract.mjs";

const temporaryRoots = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("encrypted backup contract", () => {
  it("creates deterministic archive names and validates retention and recipients", () => {
    expect(createBackupArchiveName(new Date("2026-07-13T01:02:03.456Z"))).toBe(
      "modu-brain-supabase-2026-07-13T01-02-03-456Z.tar.age",
    );
    expect(parseRetentionDays(undefined)).toBe(7);
    expect(parseRetentionDays("30")).toBe(30);
    expect(() => parseRetentionDays(0)).toThrow(/1 to 90/);
    expect(validateAgeRecipient(`age1${"q".repeat(58)}`)).toBe(`age1${"q".repeat(58)}`);
    expect(() => validateAgeRecipient("AGE-SECRET-KEY-PRIVATE")).toThrow(/public recipient/);
  });

  it("rejects archive traversal, unknown files, and incomplete payloads", () => {
    const valid = ["./", "./backup-manifest.json", ...Object.values(BACKUP_FILES)
      .map((file) => `./${file}`)].join("\n");
    expect(validateArchiveEntries(valid)).toHaveLength(5);
    expect(() => validateArchiveEntries(`${valid}\n../secret.txt`)).toThrow(/unsafe/);
    expect(() => validateArchiveEntries("./backup-manifest.json\n./roles.sql")).toThrow(
      /missing/,
    );
  });

  it("validates the versioned age manifest and fixed filenames", () => {
    const checksum = "a".repeat(64);
    const manifest = {
      formatVersion: 2,
      encryption: { format: "age" },
      files: BACKUP_FILES,
      restoreOrder: RESTORE_ORDER,
      sha256: Object.fromEntries(RESTORE_ORDER.map((name) => [name, checksum])),
    };
    expect(validateBackupManifest(manifest)).toBe(manifest);
    expect(() => validateBackupManifest({ ...manifest, formatVersion: 1 })).toThrow(
      /formatVersion 2/,
    );
    expect(() => validateBackupManifest({
      ...manifest,
      files: { ...BACKUP_FILES, data: "../data.sql" },
    })).toThrow(/invalid data filename/);
  });

  it("detects plaintext recursively without following symlinks", async () => {
    const root = await temporaryDirectory();
    await mkdir(path.join(root, "legacy"));
    await writeFile(path.join(root, "legacy", "data.sql"), "secret");
    await writeFile(path.join(root, "backup.tar"), "secret");
    await writeFile(path.join(root, "safe.tar.age"), "ciphertext");
    await expect(findPlaintextBackupArtifacts(root)).resolves.toEqual([
      path.join(root, "backup.tar"),
      path.join(root, "legacy", "data.sql"),
    ].sort());
  });

  it("prunes only expired contract-named encrypted archives", async () => {
    const root = await temporaryDirectory();
    const now = new Date("2026-07-13T12:00:00.000Z").getTime();
    const old = path.join(
      root,
      createBackupArchiveName(new Date("2026-07-01T12:00:00.000Z")),
    );
    const recent = path.join(
      root,
      createBackupArchiveName(new Date("2026-07-12T12:00:00.000Z")),
    );
    const unrelated = path.join(root, "other-backup.tar.age");
    await Promise.all([
      writeFile(old, "ciphertext"),
      writeFile(recent, "ciphertext"),
      writeFile(unrelated, "ciphertext"),
    ]);
    await utimes(old, new Date(now - 12 * 86_400_000), new Date(now - 12 * 86_400_000));
    await utimes(recent, new Date(now - 86_400_000), new Date(now - 86_400_000));

    await expect(
      pruneExpiredEncryptedBackups(root, { retentionDays: 7, now }),
    ).resolves.toEqual([old]);
    await expect(findPlaintextBackupArtifacts(root)).resolves.toEqual([]);
  });

  it("rejects production and ambiguous remote restore targets before decryption", () => {
    const local = {
      RESTORE_DATABASE_URL: "postgresql://postgres:secret@127.0.0.1:54322/postgres",
      CONFIRM_RESTORE_TARGET: "empty-target",
    };
    expect(assertSafeRestoreTarget(local)).toBe(local.RESTORE_DATABASE_URL);
    expect(() => assertSafeRestoreTarget({ ...local, DATABASE_URL: local.RESTORE_DATABASE_URL }))
      .toThrow(/DATABASE_URL/);
    expect(() => assertSafeRestoreTarget({ ...local, RESTORE_TARGET_ENVIRONMENT: "production" }))
      .toThrow(/production/);

    const remote = {
      RESTORE_DATABASE_URL: "postgresql://postgres.staging:secret@db.staging.supabase.co/postgres",
      CONFIRM_RESTORE_TARGET: "empty-target",
    };
    expect(() => assertSafeRestoreTarget(remote)).toThrow(/Remote restore drills require/);
    expect(assertSafeRestoreTarget({
      ...remote,
      RESTORE_TARGET_ENVIRONMENT: "staging",
      ALLOW_REMOTE_RESTORE_DRILL: "true",
      MODU_BRAIN_PRODUCTION_DATABASE_URL:
        "postgresql://postgres.production:secret@db.production.supabase.co/postgres",
    })).toBe(remote.RESTORE_DATABASE_URL);
  });

  it("uses Credential Manager by default and gates identity-file fallback", () => {
    expect(resolveAgeIdentitySource({}, "win32")).toEqual({
      type: "windows-credential",
      target: DEFAULT_CREDENTIAL_TARGET,
    });
    expect(() => resolveAgeIdentitySource({
      MODU_BRAIN_AGE_IDENTITY_FILE: "identity.txt",
    }, "linux")).toThrow(/disabled/);
    expect(resolveAgeIdentitySource({
      MODU_BRAIN_AGE_IDENTITY_FILE: "identity.txt",
      MODU_BRAIN_ALLOW_IDENTITY_FILE: "true",
    }, "linux")).toEqual({
      type: "file",
      path: path.resolve("identity.txt"),
    });
  });

  it("redacts connection strings from command failures", () => {
    expect(redactCommandOutput("failed postgresql://user:secret@host/db", [
      "postgresql://user:secret@host/db",
    ])).toBe("failed [REDACTED]");
  });
});

async function temporaryDirectory() {
  const root = await mkdtemp(path.join(os.tmpdir(), "modu-brain-backup-test-"));
  temporaryRoots.push(root);
  return root;
}
