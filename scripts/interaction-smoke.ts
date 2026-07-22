import assert from 'node:assert/strict'
import { config } from 'dotenv'
import { and, count, gte, sql } from 'drizzle-orm'
import { createDatabase } from '../api/_lib/db/database.js'
import { interactionEvents } from '../api/_lib/db/schema.js'
import {
  createDataRepositories,
  createDrizzleDataWriters,
} from '../api/_lib/db/repositories.js'
import { databaseUrlForSmoke } from './dbSmokeEnvironment.js'

config({ path: '.env.local', quiet: true })

const runSmokeTest = async () => {
  const database = createDatabase(databaseUrlForSmoke(process.env))
  const repositories = createDataRepositories(createDrizzleDataWriters(database))
  const windowStart = new Date()

  const syntheticEvents = [
    { eventName: 'result_shown' as const, mode: 'initiate' as const, route: 'manual_ai' as const, scenarioId: 'professor' as const },
    { eventName: 'result_shown' as const, mode: 'initiate' as const, route: 'manual_ai' as const, scenarioId: 'professor' as const },
    { eventName: 'copy_succeeded' as const, mode: 'initiate' as const, route: 'manual_ai' as const, scenarioId: 'professor' as const, toneLevel: 1 as const },
    {
      eventName: 'result_shown' as const,
      mode: 'reply' as const,
      route: 'guided_ai' as const,
      scenarioId: 'friend' as const,
      situationId: 'schedule' as const,
    },
  ]

  try {
    for (const event of syntheticEvents) {
      await repositories.interactionEvents.record(event)
    }

    // 허용 event 집계 query: route/scenario/eventName 단위 카운트만 조회한다 — 원문·식별자 없음.
    const aggregate = await database
      .select({
        count: count(),
        eventName: interactionEvents.eventName,
        route: interactionEvents.route,
        scenarioId: interactionEvents.scenarioId,
      })
      .from(interactionEvents)
      .where(gte(interactionEvents.createdAt, windowStart))
      .groupBy(interactionEvents.eventName, interactionEvents.route, interactionEvents.scenarioId)

    const sortKey = (row: { eventName: string; route: string; scenarioId: string }) =>
      `${row.eventName}:${row.route}:${row.scenarioId}`
    aggregate.sort((left, right) => sortKey(left).localeCompare(sortKey(right)))

    assert.deepEqual(aggregate, [
      { count: 1, eventName: 'copy_succeeded', route: 'manual_ai', scenarioId: 'professor' },
      { count: 1, eventName: 'result_shown', route: 'guided_ai', scenarioId: 'friend' },
      { count: 2, eventName: 'result_shown', route: 'manual_ai', scenarioId: 'professor' },
    ])

    console.log(
      'T24 interaction_events 집계 query smoke passed:',
      JSON.stringify(aggregate),
    )
  } finally {
    const deleted = await database
      .delete(interactionEvents)
      .where(
        and(
          gte(interactionEvents.createdAt, windowStart),
          sql`(${interactionEvents.eventName}, ${interactionEvents.route}, ${interactionEvents.scenarioId}, ${interactionEvents.mode}) in (
            ('result_shown', 'manual_ai', 'professor', 'initiate'),
            ('copy_succeeded', 'manual_ai', 'professor', 'initiate'),
            ('result_shown', 'guided_ai', 'friend', 'reply')
          )`,
        ),
      )
      .returning({ eventName: interactionEvents.eventName })
    assert.equal(deleted.length, syntheticEvents.length)
  }
}

await runSmokeTest()
