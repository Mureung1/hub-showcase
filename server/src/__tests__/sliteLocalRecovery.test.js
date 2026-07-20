import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const recoveryCli = join(repositoryRoot, 'scripts/deployment/slite-local-recovery.mjs')

async function writePrivate(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  await writeFile(path, value, { mode: 0o600 })
  await chmod(path, 0o600)
}

function run(command, args) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '' },
  })
}

async function createFixture({ databaseSchema = 'noticepilot.sliteSqlite.v1' } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'noticepilot-recovery-test-'))
  await chmod(root, 0o700)
  const runtime = join(root, '.noticepilot-local')
  const authority = join(runtime, 'share/caddy/pki/authorities/local')
  const backupRoot = join(root, 'backups')
  const restoreRoot = join(root, 'restores')
  await mkdir(authority, { recursive: true, mode: 0o700 })
  await mkdir(backupRoot, { mode: 0o700 })
  await mkdir(restoreRoot, { mode: 0o700 })

  const databasePath = join(runtime, 'slite.sqlite3')
  const databaseResult = run(process.env.NOTICEPILOT_PYTHON || 'python3', [
    '-B',
    '-c',
    [
      'import os, sqlite3, sys',
      'from pathlib import Path',
      'sys.path.insert(0, str(Path(sys.argv[2]) / "server" / "python"))',
      'from slite_feed_bridge import SliteFeedBridge',
      'database = Path(sys.argv[1]).resolve()',
      'bridge = SliteFeedBridge(Path(sys.argv[2]) / "packages" / "noticepilot-knu-crawler", database)',
      'bridge.provision({})',
      'bridge.close()',
      'connection = sqlite3.connect(database)',
      'schema = sys.argv[3]',
      'connection.execute("UPDATE slite_metadata SET schema_version = ?", (schema,))',
      'connection.execute("DROP TABLE slite_source_state") if schema.endswith("v1") else None',
      'connection.execute("DROP TABLE slite_materialized_snapshot") if schema.endswith("v1") else None',
      'connection.commit()',
      'connection.close()',
      'os.chmod(database, 0o600)',
    ].join('\n'),
    databasePath,
    repositoryRoot,
    databaseSchema,
  ])
  assert.equal(databaseResult.status, 0, databaseResult.stderr)

  const rootKey = join(authority, 'root.key')
  const rootCertificate = join(authority, 'root.crt')
  const intermediateKey = join(authority, 'intermediate.key')
  const intermediateRequest = join(authority, 'intermediate.csr')
  const intermediateExtensions = join(authority, 'intermediate.ext')
  const intermediateCertificate = join(authority, 'intermediate.crt')
  const rootResult = run('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    rootKey,
    '-out',
    rootCertificate,
    '-subj',
    '/CN=NoticePilot Recovery Test Root',
    '-days',
    '2',
    '-sha256',
  ])
  assert.equal(rootResult.status, 0, rootResult.stderr)
  const requestResult = run('openssl', [
    'req',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    intermediateKey,
    '-out',
    intermediateRequest,
    '-subj',
    '/CN=NoticePilot Recovery Test Intermediate',
  ])
  assert.equal(requestResult.status, 0, requestResult.stderr)
  await writePrivate(
    intermediateExtensions,
    'basicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n',
  )
  const signResult = run('openssl', [
    'x509',
    '-req',
    '-in',
    intermediateRequest,
    '-CA',
    rootCertificate,
    '-CAkey',
    rootKey,
    '-CAcreateserial',
    '-out',
    intermediateCertificate,
    '-extfile',
    intermediateExtensions,
    '-days',
    '1',
    '-sha256',
  ])
  assert.equal(signResult.status, 0, signResult.stderr)
  for (const path of [rootKey, rootCertificate, intermediateKey, intermediateCertificate]) {
    await chmod(path, 0o600)
  }

  await writePrivate(join(runtime, 'slite-admin-key'), `${'a'.repeat(64)}\n`)
  await writePrivate(
    join(root, '.env.caddy-lan'),
    [
      'NOTICEPILOT_LAN_HOST=192.168.1.50',
      'NOTICEPILOT_LAN_BIND=192.168.1.50',
      'NOTICEPILOT_LAN_CIDR=192.168.1.0/24',
      'NOTICEPILOT_LAN_HTTPS_PORT=8443',
      '',
    ].join('\n'),
  )
  await writePrivate(
    join(runtime, 'slite-feed-url'),
    `https://192.168.1.50:8443/calendar/${'T'.repeat(43)}.ics\n`,
  )
  const passphrasePath = join(root, 'recovery-passphrase')
  const wrongPassphrasePath = join(root, 'wrong-passphrase')
  await writePrivate(passphrasePath, `${'correct-passphrase-'.repeat(3)}\n`)
  await writePrivate(wrongPassphrasePath, `${'incorrect-passphrase-'.repeat(3)}\n`)

  return {
    root,
    runtime,
    authority,
    backupRoot,
    restoreRoot,
    databasePath,
    passphrasePath,
    wrongPassphrasePath,
    archivePath: join(backupRoot, 'slite-recovery.npbak'),
  }
}

async function cleanup(fixture) {
  await rm(fixture.root, { recursive: true, force: true })
}

test('REC-01 encrypted backup, verify, and restore preserve the private recovery set', async (t) => {
  const fixture = await createFixture()
  t.after(() => cleanup(fixture))

  const backup = run(process.execPath, [
    recoveryCli,
    'backup',
    fixture.root,
    fixture.passphrasePath,
    fixture.archivePath,
    '--include-feed-url',
  ])
  assert.equal(backup.status, 0, backup.stderr)
  assert.match(backup.stdout, /8 encrypted files/)
  assert.doesNotMatch(backup.stdout + backup.stderr, /calendar\//)
  assert.equal((await lstat(fixture.archivePath)).mode & 0o777, 0o600)

  const verify = run(process.execPath, [
    recoveryCli,
    'verify',
    fixture.archivePath,
    fixture.passphrasePath,
  ])
  assert.equal(verify.status, 0, verify.stderr)

  const destination = join(fixture.restoreRoot, 'restored')
  const restore = run(process.execPath, [
    recoveryCli,
    'restore',
    fixture.archivePath,
    fixture.passphrasePath,
    destination,
  ])
  assert.equal(restore.status, 0, restore.stderr)
  assert.equal((await lstat(destination)).mode & 0o777, 0o700)
  const restoredKey = join(destination, '.noticepilot-local/slite-admin-key')
  const restoredUrl = join(destination, '.noticepilot-local/slite-feed-url')
  assert.deepEqual(await readFile(restoredKey), await readFile(join(fixture.runtime, 'slite-admin-key')))
  assert.deepEqual(await readFile(restoredUrl), await readFile(join(fixture.runtime, 'slite-feed-url')))
  assert.equal((await lstat(restoredKey)).mode & 0o777, 0o600)
  assert.equal((await lstat(restoredUrl)).mode & 0o777, 0o600)

  const repeated = run(process.execPath, [
    recoveryCli,
    'restore',
    fixture.archivePath,
    fixture.passphrasePath,
    destination,
  ])
  assert.notEqual(repeated.status, 0)
  assert.match(repeated.stderr, /destination already exists/)
})

test('REC-02 wrong passphrases and modified ciphertext fail authentication', async (t) => {
  const fixture = await createFixture()
  t.after(() => cleanup(fixture))
  const backup = run(process.execPath, [
    recoveryCli,
    'backup',
    fixture.root,
    fixture.passphrasePath,
    fixture.archivePath,
  ])
  assert.equal(backup.status, 0, backup.stderr)

  const wrong = run(process.execPath, [
    recoveryCli,
    'verify',
    fixture.archivePath,
    fixture.wrongPassphrasePath,
  ])
  assert.notEqual(wrong.status, 0)
  assert.match(wrong.stderr, /authentication failed/)

  const envelope = JSON.parse(await readFile(fixture.archivePath, 'utf8'))
  const ciphertext = Buffer.from(envelope.ciphertextBase64, 'base64')
  ciphertext[0] ^= 1
  envelope.ciphertextBase64 = ciphertext.toString('base64')
  await writePrivate(fixture.archivePath, `${JSON.stringify(envelope)}\n`)
  const modified = run(process.execPath, [
    recoveryCli,
    'verify',
    fixture.archivePath,
    fixture.passphrasePath,
  ])
  assert.notEqual(modified.status, 0)
  assert.match(modified.stderr, /authentication failed/)
})

test('REC-03 source secrets with broad permissions or symlinks are rejected', async (t) => {
  const broadFixture = await createFixture()
  t.after(() => cleanup(broadFixture))
  const adminKey = join(broadFixture.runtime, 'slite-admin-key')
  await chmod(adminKey, 0o644)
  const broad = run(process.execPath, [
    recoveryCli,
    'backup',
    broadFixture.root,
    broadFixture.passphrasePath,
    broadFixture.archivePath,
  ])
  assert.notEqual(broad.status, 0)
  assert.match(broad.stderr, /must not grant group or other permissions/)

  const symlinkFixture = await createFixture()
  t.after(() => cleanup(symlinkFixture))
  const rootKey = join(symlinkFixture.authority, 'root.key')
  const realKey = join(symlinkFixture.authority, 'root-real.key')
  await writePrivate(realKey, await readFile(rootKey))
  await unlink(rootKey)
  await symlink(realKey, rootKey)
  const linked = run(process.execPath, [
    recoveryCli,
    'backup',
    symlinkFixture.root,
    symlinkFixture.passphrasePath,
    symlinkFixture.archivePath,
  ])
  assert.notEqual(linked.status, 0)
  assert.match(linked.stderr, /must be a regular file/)
})

test('REC-04 a corrupt or unsupported SQLite database is rejected before backup', async (t) => {
  const fixture = await createFixture()
  t.after(() => cleanup(fixture))
  await writePrivate(fixture.databasePath, 'not a sqlite database')
  const result = run(process.execPath, [
    recoveryCli,
    'backup',
    fixture.root,
    fixture.passphrasePath,
    fixture.archivePath,
  ])
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /database snapshot failed|database validation failed/)
})

test('REC-05 the migrated S-Lite v2 database layout remains recoverable', async (t) => {
  const fixture = await createFixture({ databaseSchema: 'noticepilot.sliteSqlite.v2' })
  t.after(() => cleanup(fixture))
  const backup = run(process.execPath, [
    recoveryCli,
    'backup',
    fixture.root,
    fixture.passphrasePath,
    fixture.archivePath,
    '--include-feed-url',
  ])
  assert.equal(backup.status, 0, backup.stderr)
  const verify = run(process.execPath, [
    recoveryCli,
    'verify',
    fixture.archivePath,
    fixture.passphrasePath,
  ])
  assert.equal(verify.status, 0, verify.stderr)
})

test('REC-06 an unbootable v2 skeleton is rejected before backup', async (t) => {
  const fixture = await createFixture({ databaseSchema: 'noticepilot.sliteSqlite.v2' })
  t.after(() => cleanup(fixture))
  await unlink(fixture.databasePath)
  const skeleton = run(process.env.NOTICEPILOT_PYTHON || 'python3', [
    '-B',
    '-c',
    [
      'import os, sqlite3, sys',
      'connection = sqlite3.connect(sys.argv[1])',
      'connection.execute("CREATE TABLE slite_metadata (schema_version TEXT PRIMARY KEY)")',
      'connection.execute("CREATE TABLE slite_feed (singleton INTEGER PRIMARY KEY)")',
      'connection.execute("CREATE TABLE slite_source_state (source_id TEXT PRIMARY KEY)")',
      'connection.execute("CREATE TABLE slite_materialized_snapshot (singleton INTEGER PRIMARY KEY)")',
      'connection.execute("INSERT INTO slite_metadata VALUES (?)", ("noticepilot.sliteSqlite.v2",))',
      'connection.commit()',
      'connection.close()',
      'os.chmod(sys.argv[1], 0o600)',
    ].join(';'),
    fixture.databasePath,
  ])
  assert.equal(skeleton.status, 0, skeleton.stderr)

  const backup = run(process.execPath, [
    recoveryCli,
    'backup',
    fixture.root,
    fixture.passphrasePath,
    fixture.archivePath,
  ])
  assert.notEqual(backup.status, 0)
  assert.match(backup.stderr, /database runtime validation failed/)
})
