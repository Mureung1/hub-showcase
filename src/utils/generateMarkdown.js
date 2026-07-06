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
}

export function generateMarkdown(analysisResult, markdownCopy = defaultMarkdownCopy) {
  if (!analysisResult) {
    return markdownCopy.unavailable
  }

  return [
    `# ${analysisResult.title || markdownCopy.fallbackTitle}`,
    '',
    analysisResult.summary ? `> ${analysisResult.summary}` : '',
    '',
    `## ${markdownCopy.deadlines}`,
    ...(analysisResult.deadlines.length
      ? analysisResult.deadlines.map(formatDeadline)
      : [`- ${markdownCopy.noDeadlines}`]),
    '',
    `## ${markdownCopy.tasks}`,
    ...(analysisResult.tasks.length
      ? analysisResult.tasks.map(formatTask)
      : [`- [ ] ${markdownCopy.noTasks}`]),
    '',
    `## ${markdownCopy.submissions}`,
    ...(analysisResult.submissions.length
      ? analysisResult.submissions.map(formatTitleOrText)
      : [`- ${markdownCopy.noSubmissions}`]),
    '',
    `## ${markdownCopy.requirements}`,
    ...(analysisResult.requirements.length
      ? analysisResult.requirements.map(formatTitleOrText)
      : [`- ${markdownCopy.noRequirements}`]),
    '',
    `## ${markdownCopy.cautions}`,
    ...(analysisResult.cautions.length
      ? analysisResult.cautions.map(formatTitleOrText)
      : [`- ${markdownCopy.noCautions}`]),
    '',
  ]
    .filter((line) => line !== undefined)
    .join('\n')
}
