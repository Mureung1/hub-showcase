import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  isTerminalRuntimeRunEvent,
  isTerminalRuntimeRunStatus,
} from '@ay-ple/runtime-core'
import type {
  RuntimeAdapterDescriptor,
  RuntimeRunEvent,
  RuntimeRunLog,
  RuntimeRunStatus,
  RuntimeRunSummary,
} from '@ay-ple/runtime-core'
import type { CodexCapabilitySlot } from '@ay-ple/runtime-codex/capabilities'
import './App.css'

type HealthState = 'checking' | 'ok' | 'error'
type InspectorRunStatus = RuntimeRunStatus | 'idle'
type FakeScenario = 'normal' | 'failure'

type CodexRuntimeStatus = {
  ok: boolean
  codexBinPath: string | null
  version: string | null
  pinnedVersion: string
  versionMatchesPin: boolean | null
  cwd: string | null
  runtimeHome: {
    codexHome: string
    codexSqliteHome: string
  } | null
  config?: {
    configPath: string
    authCredentialsStore: string | null
    fileAuthConfigPresent: boolean
  } | null
  auth?: {
    authMethod: string | null
    requiresOpenaiAuth: boolean | null
  }
  error?: string
}

function App() {
  const [health, setHealth] = useState<HealthState>('checking')
  const [adapters, setAdapters] = useState<RuntimeAdapterDescriptor[]>([])
  const [capabilitySlots, setCapabilitySlots] = useState<CodexCapabilitySlot[]>(
    [],
  )
  const [codexStatus, setCodexStatus] = useState<CodexRuntimeStatus | null>(null)
  const [selectedAdapter, setSelectedAdapter] = useState('fake')
  const [fakeScenario, setFakeScenario] = useState<FakeScenario>('normal')
  const [prompt, setPrompt] = useState('정리해줘')
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [activePrompt, setActivePrompt] = useState('')
  const [output, setOutput] = useState('')
  const [events, setEvents] = useState<RuntimeRunEvent[]>([])
  const [history, setHistory] = useState<RuntimeRunSummary[]>([])
  const [runLog, setRunLog] = useState<RuntimeRunLog | null>(null)
  const [activeStatus, setActiveStatus] = useState<InspectorRunStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const terminalRunIdsRef = useRef(new Set<string>())
  const isRunning = activeStatus === 'running'
  const isActiveRun = activeStatus === 'running' || activeStatus === 'cancelling'

  useEffect(() => {
    let active = true

    fetch('/api/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`)
        }

        return response.json() as Promise<{ ok: boolean }>
      })
      .then((data) => {
        if (active) {
          setHealth(data.ok ? 'ok' : 'error')
        }
      })
      .catch(() => {
        if (active) {
          setHealth('error')
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    Promise.all([
      fetchAdapters(),
      fetchHistory(),
      fetchCodexCapabilities(),
      fetchCodexStatus(),
    ])
      .then(([adapterList, runList, codexCapabilitySlots, status]) => {
        if (!active) {
          return
        }

        setAdapters(adapterList)
        setHistory(runList)
        setCapabilitySlots(codexCapabilitySlots)
        setCodexStatus(status)

        if (adapterList[0]) {
          setSelectedAdapter(adapterList[0].name)
        }
      })
      .catch((fetchError: unknown) => {
        if (active) {
          setError(toErrorMessage(fetchError))
        }
      })

    return () => {
      active = false
      eventSourceRef.current?.close()
    }
  }, [])

  async function handleRunSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const requestPrompt = prompt

    if (!requestPrompt.trim() || isActiveRun) {
      return
    }

    eventSourceRef.current?.close()
    setError(null)
    setEvents([])
    setOutput('')
    setRunLog(null)
    setActivePrompt(requestPrompt)
    setActiveStatus('running')
    terminalRunIdsRef.current.delete(activeRunId ?? '')

    try {
      const response = await fetch('/api/runtime/runs', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          adapter: selectedAdapter,
          prompt: requestPrompt,
          fakeScenario: isFakeFailureScenario ? 'failure' : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error(`Run start failed: ${response.status}`)
      }

      const startedRun = (await response.json()) as { runId: string }
      setActiveRunId(startedRun.runId)
      openEventStream(startedRun.runId)
    } catch (runError) {
      setActiveStatus('idle')
      setError(toErrorMessage(runError))
    }
  }

  function openEventStream(runId: string) {
    const source = new EventSource(`/api/runtime/runs/${runId}/events?after=0`)
    let terminal = false
    eventSourceRef.current = source

    source.addEventListener('runtime-event', (message) => {
      const runtimeEvent = JSON.parse(message.data) as RuntimeRunEvent

      setEvents((currentEvents) => appendRuntimeEvent(currentEvents, runtimeEvent))

      if (runtimeEvent.type === 'started') {
        setActivePrompt(runtimeEvent.prompt)
      }

      if (runtimeEvent.type === 'output_delta') {
        setOutput((currentOutput) => `${currentOutput}${runtimeEvent.delta}`)
      }

      if (runtimeEvent.type === 'cancelling') {
        setActiveStatus('cancelling')
      }

      if (isTerminalRuntimeRunEvent(runtimeEvent)) {
        terminal = true
        terminalRunIdsRef.current.add(runId)
        setActiveStatus(runtimeEvent.type)

        if (runtimeEvent.type === 'completed') {
          setOutput(runtimeEvent.output)
        }

        if (runtimeEvent.type === 'failed') {
          setError(runtimeEvent.error)
        }

        source.close()
        void refreshRunState(runId)
      }
    })

    source.onerror = () => {
      if (!terminal && !terminalRunIdsRef.current.has(runId)) {
        setError('Runtime event stream disconnected')
        setActiveStatus('idle')
      }

      source.close()
    }
  }

  async function handleCancelRun() {
    if (!activeRunId || !isRunning) {
      return
    }

    const runId = activeRunId
    setError(null)

    try {
      const response = await fetch(`/api/runtime/runs/${runId}/cancel`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`Run cancel failed: ${response.status}`)
      }

      const data = (await response.json()) as { run: RuntimeRunLog }
      setActiveStatus(data.run.status)
      setOutput(data.run.output)
      setEvents(data.run.events)
      setRunLog(data.run)
      setHistory(await fetchHistory())

      if (isTerminalRuntimeRunStatus(data.run.status)) {
        terminalRunIdsRef.current.add(data.run.runId)
        window.setTimeout(() => {
          void refreshRunState(runId).catch((refreshError: unknown) => {
            setError(toErrorMessage(refreshError))
          })
        }, 400)
      }
    } catch (cancelError) {
      terminalRunIdsRef.current.delete(runId)
      setError(toErrorMessage(cancelError))
    }
  }

  async function refreshCodexStatus() {
    try {
      setCodexStatus(await fetchCodexStatus())
    } catch (statusError) {
      setError(toErrorMessage(statusError))
    }
  }

  async function refreshRunState(runId: string) {
    const [latestLog, latestHistory] = await Promise.all([
      fetchRunLog(runId),
      fetchHistory(),
    ])

    setRunLog(latestLog)
    setHistory(latestHistory)
    setActiveStatus(latestLog.status)
  }

  async function handleHistorySelect(runId: string) {
    try {
      const latestLog = await fetchRunLog(runId)
      setActiveRunId(runId)
      setActivePrompt(latestLog.prompt)
      setOutput(latestLog.output)
      setEvents(latestLog.events)
      setRunLog(latestLog)
      setActiveStatus(latestLog.status)
      setError(null)
    } catch (historyError) {
      setError(toErrorMessage(historyError))
    }
  }

  const activeAdapter = adapters.find((adapter) => adapter.name === selectedAdapter)
  const isFakeAdapter = selectedAdapter === 'fake'
  const isFakeFailureScenario = isFakeAdapter && fakeScenario === 'failure'
  const canStartRun = !isActiveRun && prompt.trim().length > 0
  const terminalMessage = getTerminalMessage(activeStatus, events, runLog)
  const visibleLog =
    runLog ??
    (activeRunId
      ? {
          runId: activeRunId,
          adapter: selectedAdapter,
          prompt: activePrompt,
          status: activeStatus === 'idle' ? 'completed' : activeStatus,
          output,
          events,
        }
      : null)

  return (
    <main className="inspector-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Runtime Harness</p>
          <h1>Runtime Inspector</h1>
        </div>
        <div className={`health health-${health}`}>
          <span className="health-dot" aria-hidden="true" />
          <span>
            {health === 'checking' && 'Checking API'}
            {health === 'ok' && 'API connected'}
            {health === 'error' && 'API unavailable'}
          </span>
        </div>
      </header>

      <div className="workspace-grid">
        <section className="control-panel" aria-labelledby="run-controls-title">
          <div className="panel-header">
            <h2 id="run-controls-title">Run</h2>
            <span className={`run-state ${activeStatus}`}>
              {formatRunStatus(activeStatus)}
            </span>
          </div>

          <form className="run-form" onSubmit={handleRunSubmit}>
            <label>
              <span>Adapter</span>
              <select
                value={selectedAdapter}
                onChange={(event) => {
                  setSelectedAdapter(event.target.value)
                  setFakeScenario('normal')
                }}
              >
                {adapters.map((adapter) => (
                  <option key={adapter.name} value={adapter.name}>
                    {adapter.label}
                  </option>
                ))}
              </select>
            </label>

            {activeAdapter?.description && (
              <p className="adapter-description">{activeAdapter.description}</p>
            )}

            {isFakeAdapter && (
              <label>
                <span>Fake Scenario</span>
                <select
                  value={fakeScenario}
                  onChange={(event) =>
                    setFakeScenario(event.target.value as FakeScenario)
                  }
                >
                  <option value="normal">Normal completion</option>
                  <option value="failure">Deterministic failure</option>
                </select>
              </label>
            )}

            {selectedAdapter === 'codex' && (
              <div className="codex-status" aria-label="Codex runtime status">
                <div className="codex-status-header">
                  <span>Codex Status</span>
                  <button
                    className="status-refresh"
                    type="button"
                    onClick={() => void refreshCodexStatus()}
                  >
                    Refresh
                  </button>
                </div>

                <dl className="status-list">
                  <div>
                    <dt>Auth</dt>
                    <dd className={`auth-${readCodexAuthState(codexStatus)}`}>
                      {formatCodexAuthStatus(codexStatus)}
                    </dd>
                  </div>
                  <div>
                    <dt>Credentials</dt>
                    <dd
                      className={
                        codexStatus?.config?.fileAuthConfigPresent
                          ? 'auth-ok'
                          : 'auth-missing'
                      }
                    >
                      {codexStatus?.config?.authCredentialsStore ?? 'Unset'}
                    </dd>
                  </div>
                  <div>
                    <dt>Version</dt>
                    <dd>{codexStatus?.version ?? 'Unknown'}</dd>
                  </div>
                  <div>
                    <dt>Package pin</dt>
                    <dd>{formatCodexVersionPin(codexStatus)}</dd>
                  </div>
                  <div>
                    <dt>Binary</dt>
                    <dd>{codexStatus?.codexBinPath ?? 'Unknown'}</dd>
                  </div>
                  <div>
                    <dt>Home</dt>
                    <dd>{codexStatus?.runtimeHome?.codexHome ?? 'Unknown'}</dd>
                  </div>
                  <div>
                    <dt>SQLite</dt>
                    <dd>
                      {codexStatus?.runtimeHome?.codexSqliteHome ?? 'Unknown'}
                    </dd>
                  </div>
                  <div>
                    <dt>CWD</dt>
                    <dd>{codexStatus?.cwd ?? 'Unknown'}</dd>
                  </div>
                </dl>

                {codexStatus && !codexStatus.ok && (
                  <p className="status-error">{codexStatus.error}</p>
                )}
              </div>
            )}

            <label>
              <span>Prompt</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={6}
              />
            </label>

            <div className="run-actions">
              <button type="submit" disabled={!canStartRun}>
                Start Run
              </button>
              <button type="button" disabled={!isRunning} onClick={handleCancelRun}>
                Cancel
              </button>
            </div>
          </form>

          {error && <p className="error-line">{error}</p>}
        </section>

        <section className="transcript-panel" aria-labelledby="transcript-title">
          <div className="panel-header">
            <h2 id="transcript-title">Transcript</h2>
            <span>{activeRunId ?? 'No run'}</span>
          </div>

          <div className="transcript">
            {activePrompt ? (
              <>
                <article className="message user-message">
                  <p className="message-label">Prompt</p>
                  <p>{activePrompt}</p>
                </article>
                <article className="message runtime-message">
                  <p className="message-label">Output</p>
                  <pre>{output || terminalMessage}</pre>
                </article>
              </>
            ) : (
              <p className="empty-state">No transcript yet</p>
            )}
          </div>
        </section>

        <section className="events-panel" aria-labelledby="events-title">
          <div className="panel-header">
            <h2 id="events-title">Events</h2>
            <span>{events.length}</span>
          </div>

          <ol className="event-list">
            {events.map((event) => (
              <li key={`${event.runId}-${event.sequence}`}>
                <span className="event-sequence">#{event.sequence}</span>
                <span className="event-type">
                  {event.type}
                  {formatEventDetail(event)}
                </span>
                <span className="event-time">{formatTime(event.timestamp)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="log-panel" aria-labelledby="log-title">
          <div className="panel-header">
            <h2 id="log-title">Run Log</h2>
            <span>{visibleLog?.status ?? 'Empty'}</span>
          </div>

          <pre className="log-output">
            {visibleLog ? JSON.stringify(visibleLog, null, 2) : '{}'}
          </pre>
        </section>

        <section className="history-panel" aria-labelledby="history-title">
          <div className="panel-header">
            <h2 id="history-title">History</h2>
            <span>{history.length}</span>
          </div>

          <div className="history-list">
            {history.map((run) => (
              <button
                key={run.runId}
                className="history-item"
                type="button"
                onClick={() => void handleHistorySelect(run.runId)}
              >
                <span className="history-run-id">{run.runId}</span>
                <span>{run.adapter}</span>
                <span>{run.status}</span>
                <span className="history-preview">
                  {run.error || run.outputPreview || run.prompt}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section
          className="capability-panel"
          aria-labelledby="capability-slots-title"
        >
          <div className="panel-header">
            <h2 id="capability-slots-title">Capability Slots</h2>
            <span>{capabilitySlots.length} engine slots</span>
          </div>

          <div className="capability-list">
            {capabilitySlots.map((slot) => (
              <article className="capability-item" key={slot.id}>
                <div className="capability-heading">
                  <div>
                    <h3>{slot.label}</h3>
                    <p>{slot.category}</p>
                  </div>
                  <div className="capability-badges">
                    <span className={`capability-status ${slot.status}`}>
                      {formatCapabilityStatus(slot.status)}
                    </span>
                    <span className="capability-productized">
                      productized: {String(slot.productized)}
                    </span>
                  </div>
                </div>

                <div className="capability-methods" aria-label="Methods">
                  {slot.methods.map((method) => (
                    <code key={method}>{method}</code>
                  ))}
                </div>

                <ul className="capability-evidence">
                  {slot.evidence.map((evidence) => (
                    <li key={evidence}>
                      <code>{evidence}</code>
                    </li>
                  ))}
                </ul>

                <p className="capability-notes">{slot.notes}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

async function fetchAdapters(): Promise<RuntimeAdapterDescriptor[]> {
  const response = await fetch('/api/runtime/adapters')

  if (!response.ok) {
    throw new Error(`Adapter fetch failed: ${response.status}`)
  }

  const data = (await response.json()) as {
    adapters: RuntimeAdapterDescriptor[]
  }

  return data.adapters
}

async function fetchCodexCapabilities(): Promise<CodexCapabilitySlot[]> {
  const response = await fetch('/api/runtime/codex/capabilities')

  if (!response.ok) {
    throw new Error(`Capability slot fetch failed: ${response.status}`)
  }

  const data = (await response.json()) as { slots: CodexCapabilitySlot[] }

  return data.slots
}

async function fetchCodexStatus(): Promise<CodexRuntimeStatus> {
  const response = await fetch('/api/runtime/codex/status')

  if (!response.ok) {
    throw new Error(`Codex status fetch failed: ${response.status}`)
  }

  return (await response.json()) as CodexRuntimeStatus
}

async function fetchHistory(): Promise<RuntimeRunSummary[]> {
  const response = await fetch('/api/runtime/runs')

  if (!response.ok) {
    throw new Error(`History fetch failed: ${response.status}`)
  }

  const data = (await response.json()) as { runs: RuntimeRunSummary[] }

  return data.runs
}

async function fetchRunLog(runId: string): Promise<RuntimeRunLog> {
  const response = await fetch(`/api/runtime/runs/${runId}`)

  if (!response.ok) {
    throw new Error(`Run log fetch failed: ${response.status}`)
  }

  const data = (await response.json()) as { run: RuntimeRunLog }

  return data.run
}

function appendRuntimeEvent(
  events: RuntimeRunEvent[],
  event: RuntimeRunEvent,
): RuntimeRunEvent[] {
  if (
    events.some(
      (existingEvent) =>
        existingEvent.runId === event.runId &&
        existingEvent.sequence === event.sequence,
    )
  ) {
    return events
  }

  return [...events, event]
}

function formatRunStatus(status: InspectorRunStatus): string {
  if (status === 'idle') {
    return 'Ready'
  }

  return `${status.slice(0, 1).toUpperCase()}${status.slice(1)}`
}

function formatCapabilityStatus(status: CodexCapabilitySlot['status']): string {
  if (status === 'raw-callable') {
    return 'Raw callable'
  }

  if (status === 'schema-confirmed') {
    return 'Schema confirmed'
  }

  return 'Reserved'
}

function readCodexAuthState(
  status: CodexRuntimeStatus | null,
): 'checking' | 'ok' | 'missing' | 'error' {
  if (!status) {
    return 'checking'
  }

  if (!status.ok) {
    return 'error'
  }

  return status.auth?.authMethod ? 'ok' : 'missing'
}

function formatCodexAuthStatus(status: CodexRuntimeStatus | null): string {
  const authState = readCodexAuthState(status)

  if (authState === 'checking') {
    return 'Checking'
  }

  if (authState === 'error') {
    return 'Unavailable'
  }

  return status?.auth?.authMethod ?? 'Missing'
}

function formatCodexVersionPin(status: CodexRuntimeStatus | null): string {
  if (!status) {
    return 'Unknown'
  }

  if (status.versionMatchesPin === null) {
    return `${status.pinnedVersion} / Unknown`
  }

  return `${status.pinnedVersion} / ${status.versionMatchesPin ? 'Matched' : 'Mismatch'}`
}

function formatEventDetail(event: RuntimeRunEvent): string {
  if (event.type === 'cancelled') {
    return `: ${event.reason}`
  }

  if (event.type === 'failed') {
    return `: ${event.error}`
  }

  return ''
}

function getTerminalMessage(
  status: InspectorRunStatus,
  events: RuntimeRunEvent[],
  log: RuntimeRunLog | null,
): string {
  if (status === 'cancelled') {
    return `Run cancelled: ${findCancelledReason(events)}`
  }

  if (status === 'failed') {
    return `Run failed: ${log?.error ?? findFailedError(events)}`
  }

  if (status === 'cancelling') {
    return 'Cancelling run...'
  }

  if (status === 'completed') {
    return 'No output.'
  }

  return 'Waiting for output...'
}

function findCancelledReason(events: RuntimeRunEvent[]): string {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]

    if (event?.type === 'cancelled') {
      return event.reason
    }
  }

  return 'Runtime run cancelled'
}

function findFailedError(events: RuntimeRunEvent[]): string {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]

    if (event?.type === 'failed') {
      return event.error
    }
  }

  return 'Unknown runtime error'
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unexpected runtime inspector error'
}

function formatTime(timestamp: string): string {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp))
}

export default App
