import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'

export type DatabaseEnvironment = {
  DATABASE_URL?: string
}

export type DabnyangiDatabase = NeonHttpDatabase

export const databaseUrlFromEnvironment = (environment: DatabaseEnvironment) => {
  const databaseUrl = environment.DATABASE_URL?.trim()
  return databaseUrl || null
}

export const createDatabase = (databaseUrl: string): DabnyangiDatabase => {
  const normalizedUrl = databaseUrl.trim()
  let protocol: string

  try {
    protocol = new URL(normalizedUrl).protocol
  } catch {
    throw new Error('Database URL is invalid')
  }

  if (protocol !== 'postgres:' && protocol !== 'postgresql:') {
    throw new Error('Database URL must use PostgreSQL')
  }

  return drizzle(normalizedUrl)
}
