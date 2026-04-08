import type { TranscriptEntry } from '../hooks/useRealtimeVoice'

type TranscriptPanelProps = {
  entries: TranscriptEntry[]
}

export function TranscriptPanel({ entries }: TranscriptPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Transcript Log</h2>
        <span className="badge">{entries.length} events</span>
      </div>
      <div className="transcript-list">
        {entries.length === 0 ? (
          <div className="transcript-empty">
            Realtime session events and transcript updates will appear here.
          </div>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className={`transcript-entry ${entry.role}`}>
              <div className="transcript-meta">
                <span>{entry.role}</span>
                <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
              <p>{entry.text}</p>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
