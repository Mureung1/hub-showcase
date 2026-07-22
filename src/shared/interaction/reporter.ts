import type { InteractionEvent } from './contracts.js'

export type InteractionReporter = (event: InteractionEvent) => void

export const reportInteraction: InteractionReporter = (event) => {
  if (typeof fetch !== 'function') return

  try {
    void fetch('/api/interaction', {
      body: JSON.stringify(event),
      headers: { 'content-type': 'application/json' },
      keepalive: true,
      method: 'POST',
    }).catch(() => undefined)
  } catch {
    // Interaction metrics never interrupt the message flow.
  }
}
