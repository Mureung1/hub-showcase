interface ProjectRecord {
  id: string;
  problem_definition: string;
}

interface HypothesisRecord {
  cause: string;
  effect: string;
}

interface InterviewRecord {
  interviewee_name?: string | null;
  transcript?: string | null;
}

export function buildAnalysisMarkdown(
  project: ProjectRecord,
  hypotheses: HypothesisRecord[],
  interviews: InterviewRecord[] = [],
): string {
  const hypothesesSection = hypotheses
    .map(
      (h, index) =>
        `### Hypothesis ${index + 1}\n\n- Cause: ${h.cause}\n- Effect: ${h.effect}`,
    )
    .join('\n\n');

  const interviewsSection = interviews
    .filter((i) => i.transcript?.trim())
    .map((i, index) => {
      const name = i.interviewee_name?.trim() || `Interviewee ${index + 1}`;
      return `### Interview ${index + 1} — ${name}\n\n${i.transcript!.trim()}`;
    })
    .join('\n\n');

  const interviewsBlock = interviewsSection
    ? `\n## Interview Transcripts\n\n${interviewsSection}\n`
    : '';

  return `# Analysis Request: Project ${project.id}

## Problem Definition

${project.problem_definition}

## Hypotheses

${hypothesesSection}
${interviewsBlock}`;
}
