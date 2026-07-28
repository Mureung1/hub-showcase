import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function getKey() {
  const key = process.env.ACCOUNT_ENCRYPTION_KEY
  if (!key || key.length !== 64) {
    throw new Error('ACCOUNT_ENCRYPTION_KEY는 32바이트(64자 hex) 문자열이어야 합니다.')
  }
  return Buffer.from(key, 'hex')
}

export function encrypt(plainText) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':')
}

export function decrypt(payload) {
  const [ivB64, authTagB64, ciphertextB64] = String(payload).split(':')
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('복호화할 수 없는 값입니다.')
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))

  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()])
  return plaintext.toString('utf8')
}
