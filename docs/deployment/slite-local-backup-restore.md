# S-Lite Local Backup and Restore

## Boundary

The local recovery tool creates one authenticated encrypted archive for the
single-host S-Lite runtime. It is intended for operator-controlled backup and
restore drills before public deployment.

The fixed recovery set contains:

- the SQLite feed database;
- the administrator key;
- the LAN Caddy environment file;
- the Caddy local root and intermediate certificates and private keys;
- optionally, the retained capability URL needed to prove client continuity.

The archive does not contain Caddy leaf certificates, caches, logs, or the
entire Caddy data directory. Caddy can issue a new leaf certificate from the
restored CA. The archive uses `scrypt` plus AES-256-GCM and is created with mode
`0600`; restored directories and files use modes `0700` and `0600`.

This is not a scheduled or off-host backup service. Keeping the archive and its
passphrase only on the same host does not protect against host loss. Store them
in separately controlled locations after the drill.

## Safety Rules

- Stop Node and Caddy for an operator-approved cold backup.
- Supply the passphrase only through a regular mode-`0600` file. Do not pass it
  in a command argument value, environment variable, chat message, or log.
- Use at least 32 bytes of randomly generated passphrase material.
- Include the retained feed URL only when continuity of an existing client URL
  is the recovery goal.
- Never restore over an existing directory. The tool accepts only a new path
  under a private parent directory.
- Treat the archive as sensitive despite encryption. It contains CA private
  keys and can contain the raw capability URL.
- After a compromise, restore only as a bridge to recovery, then rotate both
  administrator credentials and the feed capability. Restoring an older
  archive can otherwise reactivate credentials that were retired later.

## Create and Verify a Backup

Create private local directories and a passphrase file. Generate the
passphrase with a trusted local random generator and keep it separate from the
archive after verification.

```bash
mkdir -p .noticepilot-local/backups
chmod 700 .noticepilot-local/backups
chmod 600 .noticepilot-local/slite-recovery-passphrase
```

After stopping Node and Caddy, create an archive that includes the currently
retained URL:

```bash
node scripts/deployment/slite-local-recovery.mjs backup \
  "$PWD" \
  .noticepilot-local/slite-recovery-passphrase \
  .noticepilot-local/backups/slite-recovery.npbak \
  --include-feed-url
```

The command rejects missing files, symlinks, group/other-readable secrets,
unknown SQLite schemas, failed SQLite integrity checks, mismatched CA keys, an
invalid LAN environment, an inconsistent retained URL, and an existing output
archive.

Verify the encrypted archive independently:

```bash
node scripts/deployment/slite-local-recovery.mjs verify \
  .noticepilot-local/backups/slite-recovery.npbak \
  .noticepilot-local/slite-recovery-passphrase
```

Verification authenticates and decrypts the archive in memory, checks every
file size and SHA-256 digest, validates SQLite integrity, and boots a private
database copy through the real S-Lite bridge so a table-name-only v1/v2
skeleton cannot be reported as recoverable. It also verifies both CA
certificate/key pairs. It
does not print tokens, URLs, keys, token fingerprints, or certificate
fingerprints.

## Restore into a New Directory

Create a private parent and select a destination that does not exist:

```bash
mkdir -p .noticepilot-local/restore-drills
chmod 700 .noticepilot-local/restore-drills

node scripts/deployment/slite-local-recovery.mjs restore \
  .noticepilot-local/backups/slite-recovery.npbak \
  .noticepilot-local/slite-recovery-passphrase \
  .noticepilot-local/restore-drills/drill-1
```

The restored tree retains repository-relative paths beneath the new
destination. Start a temporary loopback-only Node process with the restored
administrator key and database, then verify:

- safe status reports the expected active or revoked state;
- the retained private URL path returns `200` and `text/calendar`;
- its returned `ETag` produces `304` on a conditional request;
- the root/intermediate CA files match the intended recovery set;
- the original service can restart and serve the same URL.

Remove the plaintext restore-drill directory after verification. Retain only
the encrypted archive and separately controlled passphrase required by the
recovery policy.

## 2026-07-20 Local Drill Evidence

The operator-approved cold drill passed with the active iPhone capability:

- eight files were encrypted, authenticated, verified, and restored;
- archive and restored-file permissions were `0600`; the restore root was
  `0700`;
- the restored SQLite runtime reported `active`, 601 events, and a
  non-recoverable subscription path;
- the retained restored capability returned `200`; its conditional request
  returned `304`;
- the administrator key, retained URL, and four CA files matched the source
  recovery set without exposing their values;
- the temporary plaintext restore was removed;
- the original Node and Caddy processes restarted and the active LAN URL
  returned `200` with no UDP 8443 listener.

The encrypted local archive remains ignored by Git. It is drill evidence, not
proof of off-host durability, automated retention, monitoring, or production
disaster recovery.

## 2026-07-20 Post-Refresh Drill Evidence

After the allowlisted source moved the retained feed from 601 to 602 events, a
second operator-approved cold drill passed:

- the v2 database, administrator key, LAN environment, Caddy CA, and retained
  URL were encrypted as eight private files and independently verified;
- the restored runtime reported `active`, 602 events, and source sequence 0;
- the retained restored capability returned `200`, and its ETag returned `304`
  on a conditional request;
- the administrator key, URL, root/intermediate certificates, and private keys
  were byte-identical to the active recovery set;
- the temporary plaintext restore directory was removed;
- the original Node and Caddy processes resumed and the LAN URL returned `200`
  with 602 events.

The original 601-event archive remains historical evidence. The newer encrypted
archive is the local last-good S1-lite recovery point; neither is an off-host
retention policy.
