interface ProjectRecord {
  id: string;
  problem_definition: string;
}

interface HypothesisRecord {
  cause: string;
  effect: string;
}

export function buildAnalysisMarkdown(project: ProjectRecord, hypotheses: HypothesisRecord[]): string {
  const hypothesesSection = hypotheses
    .map(
      (h, index) =>
        `### Hypothesis ${index + 1}\n\n- Cause: ${h.cause}\n- Effect: ${h.effect}`,
    )
    .join('\n\n');

  return `# Analysis Request: Project ${project.id}

## Problem Definition

${project.problem_definition}

## Hypotheses

${hypothesesSection}
`;
}
