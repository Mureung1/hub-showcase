# Encrypted Supabase backup runbook

Modu Brain stores manual logical backups as one authenticated
`modu-brain-supabase-*.tar.age` file. SQL dumps and the manifest exist only in a
restricted OS temporary directory while the job runs; they are never written
to the OneDrive destination. The temporary directory is removed on success and
handled failures. This is best-effort deletion, not a claim of forensic erasure
from SSD storage.

Supabase recommends regular CLI exports and off-site copies for Free projects.
The dump still follows the official `supabase db dump` roles/schema/data
sequence. Database backups do not include Storage objects, so add a separate
Storage export if the product starts using Storage.

- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase CLI backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)

## One-time Windows setup

1. Install the age CLI and verify the PostgreSQL 17 client is available.

   ```powershell
   winget install --id FiloSottile.age --exact
   age --version
   psql --version
   ```

2. Generate a native age identity. Copy the printed `age1...` recipient into
   `MODU_BRAIN_AGE_RECIPIENT`; it is public and is the only age value needed by
   the backup job.

   ```powershell
   $identity = Join-Path $env:TEMP "modu-brain-age-identity.txt"
   age-keygen -o $identity
   age-keygen -y $identity
   ```

3. Store the private identity in Windows Credential Manager, then delete the
   source file. The helper uses the native Windows Credential API and never
   prints the secret.

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ops/windows-credential.ps1 `
     -Action Set -Kind AgeIdentity `
     -Target "ModuBrain/SupabaseBackupAgeIdentity" `
     -SecretFile $identity -DeleteSource
   ```

4. Store the production database connection URL in a different Credential
   Manager entry. Enter it at the secure prompt; do not use `setx` or put it in
   the scheduled-task command line.

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ops/windows-credential.ps1 `
     -Action Set -Kind DatabaseUrl `
     -Target "ModuBrain/SupabaseDatabaseUrl"
   ```

5. Set the public recipient as a user environment variable and open a new
   terminal. No private key belongs in `.env`.

   ```powershell
   [Environment]::SetEnvironmentVariable(
     "MODU_BRAIN_AGE_RECIPIENT",
     "age1replace-with-your-public-recipient",
     "User"
   )
   ```

## Daily OneDrive job and seven-day rotation

Run once manually before scheduling:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ops/run-daily-backup.ps1
```

The default destination is
`$env:OneDriveConsumer\Modu Brain Backups\Supabase` (or `$env:OneDrive`). Only
strictly named encrypted archives older than seven days are removed. Unknown
files and directories are preserved. The job refuses to run if the destination
contains `.sql`, plain `.tar`, or `backup-manifest.json` artifacts.

Create a daily 02:00 task after the manual run succeeds. Replace the repository
path if it moves:

```powershell
$script = "C:\Users\thats\OneDrive\Desktop\codex project\hub-N031\scripts\ops\run-daily-backup.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument (
  '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"' -f $script
)
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "Modu Brain encrypted Supabase backup" `
  -Action $action -Trigger $trigger -Description "Daily age-encrypted backup with 7-day rotation"
```

## Restore drill

Restores are intentionally restricted to a disposable local database by
default. The script rejects the source `DATABASE_URL`, an explicitly configured
production URL, any target marked `production`, and unconfirmed remote targets
before decrypting the archive.

```powershell
$env:RESTORE_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
$env:CONFIRM_RESTORE_TARGET = "empty-target"
npm run ops:restore -- "C:\path\modu-brain-supabase-2026-07-13T02-00-00-000Z.tar.age"
```

For a remote disposable staging database, all three controls are required:
`RESTORE_TARGET_ENVIRONMENT=staging`, `ALLOW_REMOTE_RESTORE_DRILL=true`, and
`MODU_BRAIN_PRODUCTION_DATABASE_URL` pointing to production so equality can be
rejected. Do not set these for the scheduled backup job.

Restore decrypts into a random OS temporary directory, validates the archive
entry allowlist, manifest version, SHA-256 checksums, empty target, core tables,
and row counts, then removes the private identity, tar, SQL, and temporary
directory. A killed process can leave a temporary directory; before a later
drill, inspect `%TEMP%\modu-brain-restore-*` and remove abandoned entries.
