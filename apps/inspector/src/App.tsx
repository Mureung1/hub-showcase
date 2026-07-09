import { useEffect, useRef, useState, type FormEvent } from 'react'
import type {
  RuntimeAdapterDescriptor,
  RuntimeRunEvent,
  RuntimeRunLog,
  RuntimeRunSummary,
} from '@ay-ple/runtime-core'
import './App.css'

type HealthState = 'checking' | 'ok' | 'error'

function App() {
  const [health, setHealth] = useState<HealthState>('checking')
  const [adapters, setAdapters] = useState<RuntimeAdapterDescriptor[]>([])
  const [selectedAdapter, setSelectedAdapter] = useState('fake')
  const [prompt, setPrompt] = useState('정리해줘')
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [activePrompt, setActivePrompt] = useState('')
  const [output, setOutput] = useState('')
  const [events, setEvents] = useState<RuntimeRunEvent[]>([])
  const [history, setHistory] = useState<RuntimeRunSummary[]>([])
  const [runLog, setRunLog] = useState<RuntimeRunLog | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

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

    Promise.all([fetchAdapters(), fetchHistory()])
      .then(([adapterList, runList]) => {
        if (!active) {
          return
        }

        setAdapters(adapterList)
        setHistory(runList)

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

    if (!prompt.trim() || isRunning) {
      return
    }

    eventSourceRef.current?.close()
    setError(null)
    setEvents([])
    setOutput('')
    setRunLog(null)
    setActivePrompt(prompt)
    setIsRunning(true)

    try {
      const response = await fetch('/api/runtime/runs', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          adapter: selectedAdapter,
          prompt,
        }),
      })

      if (!response.ok) {
        throw new Error(`Run start failed: ${response.status}`)
      }

      const startedRun = (await response.json()) as { runId: string }
      setActiveRunId(startedRun.runId)
      openEventStream(startedRun.runId)
    } catch (runError) {
      setIsRunning(false)
      setError(toErrorMessage(runError))
    }
  }

  function openEventStream(runId: string) {
    const source = new EventSource(`/api/runtime/runs/${runId}/events?after=0`)
    let completed = false
    eventSourceRef.current = source

    source.addEventListener('runtime-event', (message) => {
      const runtimeEvent = JSON.parse(message.data) as RuntimeRunEvent

      setEvents((currentEvents) => [...currentEvents, runtimeEvent])

      if (runtimeEvent.type === 'started') {
        setActivePrompt(runtimeEvent.prompt)
      }

      if (runtimeEvent.type === 'output_delta') {
        setOutput((currentOutput) => `${currentOutput}${runtimeEvent.delta}`)
      }

      if (runtimeEvent.type === 'completed') {
        completed = true
        setOutput(runtimeEvent.output)
        setIsRunning(false)
        source.close()
        void refreshRunState(runId)
      }
    })

    source.onerror = () => {
      if (!completed) {
        setError('Runtime event stream disconnected')
        setIsRunning(false)
      }

      source.close()
    }
  }

  async function refreshRunState(runId: string) {
    const [latestLog, latestHistory] = await Promise.all([
      fetchRunLog(runId),
      fetchHistory(),
    ])

    setRunLog(latestLog)
    setHistory(latestHistory)
  }

  async function handleHistorySelect(runId: string) {
    try {
      const latestLog = await fetchRunLog(runId)
      setActiveRunId(runId)
      setActivePrompt(latestLog.prompt)
      setOutput(latestLog.output)
      setEvents(latestLog.events)
      setRunLog(latestLog)
      setError(null)
    } catch (historyError) {
      setError(toErrorMessage(historyError))
    }
  }

  const activeAdapter = adapters.find((adapter) => adapter.name === selectedAdapter)
  const visibleLog =
    runLog ??
    (activeRunId
      ? {
          runId: activeRunId,
          adapter: selectedAdapter,
          prompt: activePrompt,
          status: isRunning ? 'running' : 'completed',
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
            <span className={`run-state ${isRunning ? 'running' : 'idle'}`}>
              {isRunning ? 'Running' : 'Ready'}
            </span>
          </div>

          <form className="run-form" onSubmit={handleRunSubmit}>
            <label>
              <span>Adapter</span>
              <select
                value={selectedAdapter}
                onChange={(event) => setSelectedAdapter(event.target.value)}
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

            <label>
              <span>Prompt</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={6}
              />
            </label>

            <button type="submit" disabled={isRunning || !prompt.trim()}>
              Start Run
            </button>
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
                  <pre>{output || 'Waiting for output...'}</pre>
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
                <span className="event-type">{event.type}</span>
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
                  {run.outputPreview || run.prompt}
                </span>
              </button>
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
