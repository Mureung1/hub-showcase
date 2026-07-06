import CalendarEventList from './CalendarEventList.jsx'
import CautionList from './CautionList.jsx'
import DeadlineList from './DeadlineList.jsx'
import RequirementList from './RequirementList.jsx'
import SubmissionList from './SubmissionList.jsx'
import TaskList from './TaskList.jsx'

export default function AnalysisDashboard({
  analysisResult,
  copy,
  cardCopy,
  collectionLabels,
  onItemUpdate,
  onItemDelete,
  onShowEvidence,
}) {
  return (
    <section className="dashboard">
      <div className="section-heading">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>{analysisResult.title}</h2>
        <p>{analysisResult.summary}</p>
      </div>

      <div className="dashboard-grid">
        <DeadlineList
          title={copy.sections.deadlines}
          typeLabel={collectionLabels.deadlines}
          cardCopy={cardCopy}
          items={analysisResult.deadlines}
          onUpdate={(id, updates) => onItemUpdate('deadlines', id, updates)}
          onDelete={(id) => onItemDelete('deadlines', id)}
          onShowEvidence={(item) => onShowEvidence('deadlines', item)}
        />
        <TaskList
          title={copy.sections.tasks}
          typeLabel={collectionLabels.tasks}
          cardCopy={cardCopy}
          items={analysisResult.tasks}
          onUpdate={(id, updates) => onItemUpdate('tasks', id, updates)}
          onDelete={(id) => onItemDelete('tasks', id)}
          onShowEvidence={(item) => onShowEvidence('tasks', item)}
        />
        <SubmissionList
          title={copy.sections.submissions}
          typeLabel={collectionLabels.submissions}
          cardCopy={cardCopy}
          items={analysisResult.submissions}
          onUpdate={(id, updates) => onItemUpdate('submissions', id, updates)}
          onDelete={(id) => onItemDelete('submissions', id)}
          onShowEvidence={(item) => onShowEvidence('submissions', item)}
        />
        <RequirementList
          title={copy.sections.requirements}
          typeLabel={collectionLabels.requirements}
          cardCopy={cardCopy}
          items={analysisResult.requirements}
          onUpdate={(id, updates) => onItemUpdate('requirements', id, updates)}
          onDelete={(id) => onItemDelete('requirements', id)}
          onShowEvidence={(item) => onShowEvidence('requirements', item)}
        />
        <CautionList
          title={copy.sections.cautions}
          typeLabel={collectionLabels.cautions}
          cardCopy={cardCopy}
          items={analysisResult.cautions}
          onUpdate={(id, updates) => onItemUpdate('cautions', id, updates)}
          onDelete={(id) => onItemDelete('cautions', id)}
          onShowEvidence={(item) => onShowEvidence('cautions', item)}
        />
        <CalendarEventList
          title={copy.sections.calendarEvents}
          typeLabel={collectionLabels.calendarEvents}
          cardCopy={cardCopy}
          items={analysisResult.calendarEvents}
          onUpdate={(id, updates) => onItemUpdate('calendarEvents', id, updates)}
          onDelete={(id) => onItemDelete('calendarEvents', id)}
          onShowEvidence={(item) => onShowEvidence('calendarEvents', item)}
        />
      </div>
    </section>
  )
}
