import {
  databaseUrlFromEnvironment,
  type DatabaseEnvironment,
} from '../api/_lib/db/database.js'

export const databaseSmokeConfirmation = 't30-development-write'

export type DatabaseSmokeEnvironment = DatabaseEnvironment & {
  DB_SMOKE_CONFIRM?: string
  VERCEL_ENV?: string
}

export const databaseUrlForSmoke = (environment: DatabaseSmokeEnvironment) => {
  if (environment.VERCEL_ENV === 'production') {
    throw new Error('T30 database smoke test cannot run against the production environment')
  }
  if (environment.DB_SMOKE_CONFIRM !== databaseSmokeConfirmation) {
    throw new Error(
      `Set DB_SMOKE_CONFIRM=${databaseSmokeConfirmation} to allow temporary development rows`,
    )
  }

  const databaseUrl = databaseUrlFromEnvironment(environment)
  if (!databaseUrl) {
    throw new Error('Set DATABASE_URL in .env.local before running the T30 database smoke test')
  }
  return databaseUrl
}
