import { spawnSync } from 'node:child_process'
import {
  X509Certificate,
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  randomBytes,
  scryptSync,
} from 'node:crypto'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { parseSliteLanEnvironmentText } from './validate-slite-lan-env.mjs'

const FORMAT = 'noticepilot.sliteRecovery.v1'
const DATABASE_LAYOUTS = new Map([
  [
    'noticepilot.sliteSqlite.v1',
    ['slite_feed', 'slite_metadata'],
  ],
  [
    'noticepilot.sliteSqlite.v2',
    [
      'slite_feed',
      'slite_materialized_snapshot',
      'slite_metadata',
      'slite_source_state',
    ],
  ],
])
const SCRYPT = Object.freeze({ N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024
const BASE_FILES = Object.freeze([
  '.noticepilot-local/slite.sqlite3',
  '.noticepilot-local/slite-admin-key',
  '.env.caddy-lan',
  '.noticepilot-local/share/caddy/pki/authorities/local/root.crt',
  '.noticepilot-local/share/caddy/pki/authorities/local/root.key',
  '.noticepilot-local/share/caddy/pki/authorities/local/intermediate.crt',
  '.noticepilot-local/share/caddy/pki/authorities/local/intermediate.key',
])
const OPTIONAL_FEED_URL = '.noticepilot-local/slite-feed-url'
const FILE_LIMITS = Object.freeze({
  '.noticepilot-local/slite.sqlite3': 64 * 1024 * 1024,
  '.noticepilot-local/slite-admin-key': 4096,
  '.env.caddy-lan': 16 * 1024,
  '.noticepilot-local/share/caddy/pki/authorities/local/root.crt': 1024 * 1024,
  '.noticepilot-local/share/caddy/pki/authorities/local/root.key': 1024 * 1024,
  '.noticepilot-local/share/caddy/pki/authorities/local/intermediate.crt': 1024 * 1024,
  '.noticepilot-local/share/caddy/pki/authorities/local/intermediate.key': 1024 * 1024,
  [OPTIONAL_FEED_URL]: 4096,
})

function fail(message) {
  throw new Error(message)
}

function assertPrivateRegularFile(path, label, maximumBytes = MAX_ARCHIVE_BYTES) {
  const metadata = lstatSync(path)
  if (!metadata.isFile()) fail(`${label} must be a regular file`)
  if (metadata.nlink !== 1) fail(`${label} must not be hard-linked`)
  if ((metadata.mode & 0o077) !== 0) {
    fail(`${label} must not grant group or other permissions`)
  }
  if (metadata.size <= 0 || metadata.size > maximumBytes) {
    fail(`${label} has an invalid size`)
  }
  return metadata
}

function assertSourcePathChain(sourceRoot, relativePath) {
  const parts = relativePath.split('/')
  let current = resolve(sourceRoot)
  for (const part of parts.slice(0, -1)) {
    current = join(current, part)
    const metadata = lstatSync(current)
    if (!metadata.isDirectory()) {
      fail(`${relativePath} must not pass through a symlink or non-directory`)
    }
  }
}

function assertPrivateDirectory(path, label) {
  const metadata = lstatSync(path)
  if (!metadata.isDirectory()) fail(`${label} must be a directory`)
  if ((metadata.mode & 0o077) !== 0) {
    fail(`${label} must not grant group or other permissions`)
  }
}

function readPassphrase(path) {
  assertPrivateRegularFile(path, 'passphrase file', 4096)
  const value = readFileSync(path, 'utf8').replace(/\r?\n$/, '')
  if (value.includes('\n') || value.includes('\r') || value.includes('\0')) {
    fail('passphrase file must contain one line')
  }
  const bytes = Buffer.byteLength(value)
  if (bytes < 32 || bytes > 1024) {
    fail('passphrase must contain from 32 through 1024 bytes')
  }
  return value
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function decodeCanonicalBase64(value, label) {
  if (typeof value !== 'string' || value.length === 0) fail(`${label} is invalid`)
  const decoded = Buffer.from(value, 'base64')
  if (decoded.toString('base64') !== value) fail(`${label} is invalid`)
  return decoded
}

function inspectDatabase(path) {
  const script = String.raw`
import json, os, sqlite3, sys, urllib.parse
path = os.path.abspath(sys.argv[1])
uri = "file:" + urllib.parse.quote(path, safe="/") + "?mode=ro"
connection = sqlite3.connect(uri, uri=True)
try:
    quick = [row[0] for row in connection.execute("PRAGMA quick_check")]
    tables = sorted(
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
        if not row[0].startswith("sqlite_")
    )
    versions = [row[0] for row in connection.execute(
        "SELECT schema_version FROM slite_metadata"
    )] if "slite_metadata" in tables else []
    print(json.dumps({"quick": quick, "tables": tables, "versions": versions}))
finally:
    connection.close()
`
  const result = spawnSync(process.env.NOTICEPILOT_PYTHON || 'python3', ['-B', '-c', script, path], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '' },
  })
  if (result.status !== 0) fail('S-Lite database validation failed')
  let report
  try {
    report = JSON.parse(result.stdout)
  } catch {
    fail('S-Lite database validation returned an invalid result')
  }
  const version = Array.isArray(report.versions) && report.versions.length === 1
    ? report.versions[0]
    : null
  const expectedTables = DATABASE_LAYOUTS.get(version)
  if (
    JSON.stringify(report.quick) !== JSON.stringify(['ok']) ||
    expectedTables === undefined ||
    JSON.stringify(report.tables) !== JSON.stringify(expectedTables)
  ) {
    fail('S-Lite database schema or integrity is invalid')
  }

  const validationRoot = mkdtempSync(join(tmpdir(), 'noticepilot-slite-validate-'))
  chmodSync(validationRoot, 0o700)
  const validationPath = join(validationRoot, 'slite.sqlite3')
  try {
    copyFileSync(path, validationPath)
    chmodSync(validationPath, 0o600)
    const bridgePath = fileURLToPath(
      new URL('../../server/python/slite_feed_bridge.py', import.meta.url),
    )
    const boot = spawnSync(
      process.env.NOTICEPILOT_PYTHON || 'python3',
      ['-B', bridgePath, '--database-path', validationPath],
      {
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH ?? '',
          PYTHONDONTWRITEBYTECODE: '1',
        },
        input: '{"id":"recovery-check","method":"get_status","params":{}}\n',
        timeout: 30_000,
      },
    )
    if (boot.status !== 0) fail('S-Lite database runtime validation failed')
    let response
    try {
      response = JSON.parse(boot.stdout.trim())
    } catch {
      fail('S-Lite database runtime validation returned an invalid result')
    }
    if (
      response?.id !== 'recovery-check' ||
      (response?.ok !== true && response?.error?.code !== 'not_found')
    ) {
      fail('S-Lite database is not bootable by the feed runtime')
    }
  } finally {
    rmSync(validationRoot, { recursive: true, force: true })
  }
}

function snapshotDatabase(sourcePath) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'noticepilot-slite-backup-'))
  chmodSync(temporaryRoot, 0o700)
  const destinationPath = join(temporaryRoot, 'slite.sqlite3')
  const script = String.raw`
import os, sqlite3, sys, urllib.parse
source_path = os.path.abspath(sys.argv[1])
destination_path = os.path.abspath(sys.argv[2])
uri = "file:" + urllib.parse.quote(source_path, safe="/") + "?mode=ro"
source = sqlite3.connect(uri, uri=True)
destination = sqlite3.connect(destination_path)
try:
    source.backup(destination)
finally:
    destination.close()
    source.close()
os.chmod(destination_path, 0o600)
`
  try {
    const result = spawnSync(
      process.env.NOTICEPILOT_PYTHON || 'python3',
      ['-B', '-c', script, sourcePath, destinationPath],
      { encoding: 'utf8', env: { PATH: process.env.PATH ?? '' } },
    )
    if (result.status !== 0) fail('S-Lite database snapshot failed')
    assertPrivateRegularFile(
      destinationPath,
      'S-Lite database snapshot',
      FILE_LIMITS['.noticepilot-local/slite.sqlite3'],
    )
    inspectDatabase(destinationPath)
    return readFileSync(destinationPath)
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

function validateKeyMaterial(files) {
  const get = (path) => files.get(path)
  const adminKey = get('.noticepilot-local/slite-admin-key').toString('utf8').replace(/\r?\n$/, '')
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(adminKey)) {
    fail('S-Lite administrator key is invalid')
  }

  const environment = parseSliteLanEnvironmentText(get('.env.caddy-lan').toString('utf8'))
  const rootCertificate = new X509Certificate(
    get('.noticepilot-local/share/caddy/pki/authorities/local/root.crt'),
  )
  const rootKey = createPrivateKey(
    get('.noticepilot-local/share/caddy/pki/authorities/local/root.key'),
  )
  const intermediateCertificate = new X509Certificate(
    get('.noticepilot-local/share/caddy/pki/authorities/local/intermediate.crt'),
  )
  const intermediateKey = createPrivateKey(
    get('.noticepilot-local/share/caddy/pki/authorities/local/intermediate.key'),
  )
  if (
    !rootCertificate.ca ||
    !intermediateCertificate.ca ||
    !rootCertificate.checkPrivateKey(rootKey) ||
    !rootCertificate.verify(rootCertificate.publicKey) ||
    !intermediateCertificate.checkPrivateKey(intermediateKey) ||
    !intermediateCertificate.verify(rootCertificate.publicKey)
  ) {
    fail('Caddy CA certificate and key validation failed')
  }

  if (files.has(OPTIONAL_FEED_URL)) {
    let url
    try {
      url = new URL(files.get(OPTIONAL_FEED_URL).toString('utf8').trim())
    } catch {
      fail('retained S-Lite feed URL is invalid')
    }
    if (
      url.protocol !== 'https:' ||
      url.hostname !== environment.NOTICEPILOT_LAN_HOST ||
      url.port !== environment.NOTICEPILOT_LAN_HTTPS_PORT ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/^\/calendar\/[A-Za-z0-9_-]{32,256}\.ics$/.test(url.pathname)
    ) {
      fail('retained S-Lite feed URL does not match the LAN environment')
    }
  }
}

function validateDatabaseBuffer(buffer) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'noticepilot-slite-verify-'))
  chmodSync(temporaryRoot, 0o700)
  const path = join(temporaryRoot, 'slite.sqlite3')
  try {
    writeFileSync(path, buffer, { mode: 0o600, flag: 'wx' })
    inspectDatabase(path)
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

function gitCommit(sourceRoot) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: sourceRoot,
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '' },
  })
  const value = result.status === 0 ? result.stdout.trim() : ''
  return /^[0-9a-f]{40}$/.test(value) ? value : 'unknown'
}

function expectedPaths(includeFeedUrl) {
  return includeFeedUrl ? [...BASE_FILES, OPTIONAL_FEED_URL] : [...BASE_FILES]
}

function loadSourceFiles(sourceRoot, includeFeedUrl) {
  const files = new Map()
  for (const relativePath of expectedPaths(includeFeedUrl)) {
    assertSourcePathChain(sourceRoot, relativePath)
    const absolutePath = resolve(sourceRoot, relativePath)
    if (!absolutePath.startsWith(`${resolve(sourceRoot)}${sep}`)) {
      fail('backup path escaped the source root')
    }
    assertPrivateRegularFile(absolutePath, relativePath, FILE_LIMITS[relativePath])
    files.set(
      relativePath,
      relativePath === '.noticepilot-local/slite.sqlite3'
        ? snapshotDatabase(absolutePath)
        : readFileSync(absolutePath),
    )
  }
  validateDatabaseBuffer(files.get('.noticepilot-local/slite.sqlite3'))
  validateKeyMaterial(files)
  return files
}

function payloadFromFiles(sourceRoot, files, includeFeedUrl) {
  return {
    schemaVersion: FORMAT,
    createdAt: new Date().toISOString(),
    repositoryCommit: gitCommit(sourceRoot),
    includesFeedUrl: includeFeedUrl,
    files: [...files.entries()].map(([path, data]) => ({
      path,
      mode: 0o600,
      size: data.length,
      sha256: sha256(data),
      dataBase64: data.toString('base64'),
    })),
  }
}

function encryptPayload(payload, passphrase) {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = scryptSync(passphrase, salt, 32, SCRYPT)
  const aad = Buffer.from(`${FORMAT}\0${salt.toString('base64')}\0${iv.toString('base64')}`)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(aad)
  const plaintext = Buffer.from(JSON.stringify(payload))
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return {
    format: FORMAT,
    kdf: { name: 'scrypt', saltBase64: salt.toString('base64'), N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p },
    cipher: { name: 'aes-256-gcm', ivBase64: iv.toString('base64'), tagBase64: cipher.getAuthTag().toString('base64') },
    ciphertextBase64: ciphertext.toString('base64'),
  }
}

function decryptArchive(archivePath, passphrase) {
  assertPrivateRegularFile(archivePath, 'recovery archive', MAX_ARCHIVE_BYTES)
  let envelope
  try {
    envelope = JSON.parse(readFileSync(archivePath, 'utf8'))
  } catch {
    fail('recovery archive is invalid')
  }
  if (
    envelope?.format !== FORMAT ||
    envelope?.kdf?.name !== 'scrypt' ||
    envelope?.kdf?.N !== SCRYPT.N ||
    envelope?.kdf?.r !== SCRYPT.r ||
    envelope?.kdf?.p !== SCRYPT.p ||
    envelope?.cipher?.name !== 'aes-256-gcm'
  ) {
    fail('recovery archive format is unsupported')
  }
  const salt = decodeCanonicalBase64(envelope.kdf.saltBase64, 'archive salt')
  const iv = decodeCanonicalBase64(envelope.cipher.ivBase64, 'archive IV')
  const tag = decodeCanonicalBase64(envelope.cipher.tagBase64, 'archive authentication tag')
  const ciphertext = decodeCanonicalBase64(envelope.ciphertextBase64, 'archive ciphertext')
  if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16) {
    fail('recovery archive cryptographic parameters are invalid')
  }
  try {
    const key = scryptSync(passphrase, salt, 32, SCRYPT)
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAAD(Buffer.from(`${FORMAT}\0${salt.toString('base64')}\0${iv.toString('base64')}`))
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return JSON.parse(plaintext.toString('utf8'))
  } catch {
    fail('recovery archive authentication failed')
  }
}

function validatePayload(payload) {
  if (
    payload?.schemaVersion !== FORMAT ||
    typeof payload?.createdAt !== 'string' ||
    Number.isNaN(Date.parse(payload.createdAt)) ||
    !(/^[0-9a-f]{40}$/.test(payload.repositoryCommit) || payload.repositoryCommit === 'unknown') ||
    typeof payload.includesFeedUrl !== 'boolean' ||
    !Array.isArray(payload.files)
  ) {
    fail('recovery payload metadata is invalid')
  }
  const paths = expectedPaths(payload.includesFeedUrl)
  if (
    payload.files.length !== paths.length ||
    payload.files.some((entry, index) => entry?.path !== paths[index])
  ) {
    fail('recovery payload file manifest is invalid')
  }
  const files = new Map()
  for (const entry of payload.files) {
    if (
      entry.mode !== 0o600 ||
      !Number.isSafeInteger(entry.size) ||
      entry.size <= 0 ||
      entry.size > FILE_LIMITS[entry.path] ||
      !/^[0-9a-f]{64}$/.test(entry.sha256)
    ) {
      fail('recovery payload file metadata is invalid')
    }
    const data = decodeCanonicalBase64(entry.dataBase64, 'recovery payload file')
    if (data.length !== entry.size || sha256(data) !== entry.sha256) {
      fail('recovery payload file integrity failed')
    }
    files.set(entry.path, data)
  }
  validateDatabaseBuffer(files.get('.noticepilot-local/slite.sqlite3'))
  validateKeyMaterial(files)
  return files
}

export function backupSliteRecovery({ sourceRoot, passphrasePath, archivePath, includeFeedUrl = false }) {
  const root = resolve(sourceRoot)
  assertPrivateDirectory(join(root, '.noticepilot-local'), 'S-Lite runtime directory')
  const output = resolve(archivePath)
  if (existsSync(output)) fail('recovery archive destination already exists')
  assertPrivateDirectory(dirname(output), 'recovery archive parent directory')
  const passphrase = readPassphrase(resolve(passphrasePath))
  const files = loadSourceFiles(root, includeFeedUrl)
  const envelope = encryptPayload(payloadFromFiles(root, files, includeFeedUrl), passphrase)
  writeFileSync(output, `${JSON.stringify(envelope)}\n`, { mode: 0o600, flag: 'wx' })
  chmodSync(output, 0o600)
  return { fileCount: files.size, includesFeedUrl: includeFeedUrl }
}

export function verifySliteRecovery({ archivePath, passphrasePath }) {
  const payload = decryptArchive(resolve(archivePath), readPassphrase(resolve(passphrasePath)))
  const files = validatePayload(payload)
  return { fileCount: files.size, includesFeedUrl: payload.includesFeedUrl }
}

export function restoreSliteRecovery({ archivePath, passphrasePath, destinationPath }) {
  const destination = resolve(destinationPath)
  if (existsSync(destination)) fail('restore destination already exists')
  const parent = dirname(destination)
  assertPrivateDirectory(parent, 'restore destination parent directory')
  const payload = decryptArchive(resolve(archivePath), readPassphrase(resolve(passphrasePath)))
  const files = validatePayload(payload)
  const staging = join(parent, `.${basename(destination)}.staging-${randomBytes(8).toString('hex')}`)
  try {
    mkdirSync(staging, { mode: 0o700 })
    for (const [relativePath, data] of files) {
      const target = resolve(staging, relativePath)
      if (!target.startsWith(`${staging}${sep}`)) fail('restore path escaped the destination')
      mkdirSync(dirname(target), { recursive: true, mode: 0o700 })
      writeFileSync(target, data, { mode: 0o600, flag: 'wx' })
      chmodSync(target, 0o600)
    }
    renameSync(staging, destination)
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw error
  }
  return { fileCount: files.size, includesFeedUrl: payload.includesFeedUrl }
}

function usage() {
  return [
    'usage:',
    '  node slite-local-recovery.mjs backup <source-root> <passphrase-file> <archive> [--include-feed-url]',
    '  node slite-local-recovery.mjs verify <archive> <passphrase-file>',
    '  node slite-local-recovery.mjs restore <archive> <passphrase-file> <new-destination>',
  ].join('\n')
}

function runCli(argv) {
  const [command, ...args] = argv
  if (command === 'backup' && (args.length === 3 || (args.length === 4 && args[3] === '--include-feed-url'))) {
    const result = backupSliteRecovery({
      sourceRoot: args[0],
      passphrasePath: args[1],
      archivePath: args[2],
      includeFeedUrl: args[3] === '--include-feed-url',
    })
    process.stdout.write(`S-Lite recovery backup is valid (${result.fileCount} encrypted files).\n`)
    return
  }
  if (command === 'verify' && args.length === 2) {
    const result = verifySliteRecovery({ archivePath: args[0], passphrasePath: args[1] })
    process.stdout.write(`S-Lite recovery archive is valid (${result.fileCount} encrypted files).\n`)
    return
  }
  if (command === 'restore' && args.length === 3) {
    const result = restoreSliteRecovery({
      archivePath: args[0],
      passphrasePath: args[1],
      destinationPath: args[2],
    })
    process.stdout.write(`S-Lite recovery restore is valid (${result.fileCount} private files).\n`)
    return
  }
  fail(usage())
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runCli(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`S-Lite recovery rejected: ${error.message}\n`)
    process.exitCode = 1
  }
}
