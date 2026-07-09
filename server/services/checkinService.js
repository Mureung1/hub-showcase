import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '..', 'data', 'checkins.json')

async function readAll() {
  const raw = await readFile(DATA_FILE, 'utf-8')
  return JSON.parse(raw)
}

async function writeAll(checkins) {
  await writeFile(DATA_FILE, JSON.stringify(checkins, null, 2))
}

export async function getCheckins() {
  return readAll()
}

export async function createCheckin(entry) {
  const checkins = await readAll()
  const newCheckin = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  }
  checkins.push(newCheckin)
  await writeAll(checkins)
  return newCheckin
}
