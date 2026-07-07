function formatDeadline(deadline) {
  const time = deadline.time ? ` ${deadline.time}` : ''
  return `- ${deadline.title}: ${deadline.date}${time}`
}

function formatTask(task) {
  return `- [${task.completed ? 'x' : ' '}] ${task.title}`
}

function formatTitleOrText(item) {
  return `- ${item.title || item.text}`
}

function withEvidence(line, item, markdownCopy, includeEvidence) {
  if (!includeEvidence || !item.evidence) {
    return [line]
  }

  return [line, `  - ${markdownCopy.evidence}: ${item.evidence}`]
}

const defaultMarkdownCopy = {
  fallbackTitle: 'NoticePilot Checklist',
  unavailable: '# NoticePilot Checklist\n\nNo analysis result is available yet.\n',
  deadlines: 'Deadlines',
  tasks: 'Tasks',
  submissions: 'Required Submissions',
  requirements: 'Eligibility Requirements',
  cautions: 'Cautions',
  noDeadlines: 'No deadlines extracted.',
  noTasks: 'No tasks extracted.',
  noSubmissions: 'No submissions extracted.',
  noRequirements: 'No requirements extracted.',
  noCautions: 'No cautions extracted.',
  evidence: 'Evidence',
}

export function generateMarkdown(
  analysisResult,
  markdownCopy = defaultMarkdownCopy,
  options = {},
) {
  if (!analysisResult) {
    return markdownCopy.unavailable
  }

  const includeEvidence = Boolean(options.includeEvidence)

  return [
    `# ${analysisResult.title || markdownCopy.fallbackTitle}`,
    '',
    analysisResult.summary ? `> ${analysisResult.summary}` : '',
    '',
    `## ${markdownCopy.deadlines}`,
    ...(analysisResult.deadlines.length
      ? analysisResult.deadlines.flatMap((item) =>
          withEvidence(formatDeadline(item), item, markdownCopy, includeEvidence),
        )
      : [`- ${markdownCopy.noDeadlines}`]),
    '',
    `## ${markdownCopy.tasks}`,
    ...(analysisResult.tasks.length
      ? analysisResult.tasks.flatMap((item) =>
          withEvidence(formatTask(item), item, markdownCopy, includeEvidence),
        )
      : [`- [ ] ${markdownCopy.noTasks}`]),
    '',
    `## ${markdownCopy.submissions}`,
    ...(analysisResult.submissions.length
      ? analysisResult.submissions.flatMap((item) =>
          withEvidence(formatTitleOrText(item), item, markdownCopy, includeEvidence),
        )
      : [`- ${markdownCopy.noSubmissions}`]),
    '',
    `## ${markdownCopy.requirements}`,
    ...(analysisResult.requirements.length
      ? analysisResult.requirements.flatMap((item) =>
          withEvidence(formatTitleOrText(item), item, markdownCopy, includeEvidence),
        )
      : [`- ${markdownCopy.noRequirements}`]),
    '',
    `## ${markdownCopy.cautions}`,
    ...(analysisResult.cautions.length
      ? analysisResult.cautions.flatMap((item) =>
          withEvidence(formatTitleOrText(item), item, markdownCopy, includeEvidence),
        )
      : [`- ${markdownCopy.noCautions}`]),
    '',
  ]
    .filter((line) => line !== undefined)
    .join('\n')
}
