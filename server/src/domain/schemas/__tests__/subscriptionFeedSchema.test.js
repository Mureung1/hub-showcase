import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SubscriptionIcsFeedSchema,
  parseSubscriptionIcsFeed,
} from '../subscriptionFeedSchema.js'
import { createSubscriptionFeed } from './fixtures.js'

test('SubscriptionIcsFeedSchema accepts a valid student feed', () => {
  assert.equal(
    SubscriptionIcsFeedSchema.safeParse(createSubscriptionFeed()).success,
    true,
  )
})

test('selection arrays reject empty and duplicate values', () => {
  const duplicateValueByField = {
    selectedCampuses: 'chuncheon',
    selectedBoardIds: 'board-1',
    selectedNoticeTypes: 'school_notice',
    includedEventTypes: 'deadline',
    includedTargetActors: 'student',
  }

  for (const [fieldName, duplicateValue] of Object.entries(
    duplicateValueByField,
  )) {
    assert.equal(
      SubscriptionIcsFeedSchema.safeParse(
        createSubscriptionFeed({ [fieldName]: [] }),
      ).success,
      false,
      `${fieldName} empty`,
    )
    assert.equal(
      SubscriptionIcsFeedSchema.safeParse(
        createSubscriptionFeed({
          [fieldName]: [duplicateValue, duplicateValue],
        }),
      ).success,
      false,
      `${fieldName} duplicate`,
    )
  }
})

test('department is a valid explicitly included actor', () => {
  assert.equal(
    SubscriptionIcsFeedSchema.safeParse(
      createSubscriptionFeed({ includedTargetActors: ['department'] }),
    ).success,
    true,
  )
})

test('strict feed schema rejects a raw token field', () => {
  assert.equal(
    SubscriptionIcsFeedSchema.safeParse(
      createSubscriptionFeed({ rawFeedToken: 'secret-token' }),
    ).success,
    false,
  )
})

test('feed parsing does not insert default actors', () => {
  const parsedFeed = parseSubscriptionIcsFeed(
    createSubscriptionFeed({ includedTargetActors: ['department'] }),
  )

  assert.deepEqual(parsedFeed.includedTargetActors, ['department'])
})
