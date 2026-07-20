import { describe, expect, it } from 'vitest'
import { parseInteractionEvent } from './contracts'

describe('parseInteractionEvent', () => {
  it('카드 결과와 복사 event의 허용 metadata만 정규화한다', () => {
    expect(
      parseInteractionEvent({
        eventName: 'result_shown',
        mode: 'reply',
        route: 'guided_ai',
        scenarioId: 'groupwork',
        situationId: 'schedule',
      }),
    ).toEqual({
      eventName: 'result_shown',
      mode: 'reply',
      route: 'guided_ai',
      scenarioId: 'groupwork',
      situationId: 'schedule',
    })

    expect(
      parseInteractionEvent({
        eventName: 'copy_succeeded',
        mode: 'initiate',
        route: 'manual_ai',
        scenarioId: 'friend',
        toneLevel: 2,
      }),
    ).toEqual({
      eventName: 'copy_succeeded',
      mode: 'initiate',
      route: 'manual_ai',
      scenarioId: 'friend',
      toneLevel: 2,
    })
  })

  it('원문·후보·수정문·식별자와 unknown key를 거절한다', () => {
    for (const forbiddenKey of [
      'receivedMessage',
      'situation',
      'candidate',
      'editedText',
      'ip',
      'userId',
      'sessionId',
      'deviceId',
      'metadata',
    ]) {
      expect(
        parseInteractionEvent({
          eventName: 'result_shown',
          mode: 'reply',
          route: 'manual_ai',
          scenarioId: 'senior',
          [forbiddenKey]: '민감한 값',
        }),
      ).toBeNull()
    }
  })

  it('route별 situation과 copy tone 경계를 강제한다', () => {
    expect(
      parseInteractionEvent({
        eventName: 'result_shown',
        mode: 'reply',
        route: 'guided_ai',
        scenarioId: 'groupwork',
      }),
    ).toBeNull()
    expect(
      parseInteractionEvent({
        eventName: 'result_shown',
        mode: 'reply',
        route: 'manual_ai',
        scenarioId: 'friend',
        situationId: 'schedule',
      }),
    ).toBeNull()
    expect(
      parseInteractionEvent({
        eventName: 'copy_succeeded',
        mode: 'reply',
        route: 'manual_ai',
        scenarioId: 'friend',
      }),
    ).toBeNull()
    expect(
      parseInteractionEvent({
        eventName: 'refinement_opened',
        mode: 'reply',
        route: 'manual_ai',
        scenarioId: 'friend',
        toneLevel: 1,
      }),
    ).toBeNull()
    expect(
      parseInteractionEvent({
        eventName: 'result_shown',
        mode: 'reply',
        route: 'email_template',
        scenarioId: 'friend',
      }),
    ).toBeNull()
  })
})

