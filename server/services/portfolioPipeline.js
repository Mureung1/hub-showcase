import * as githubAnalyzer from './githubAnalyzer.js';
import * as jdAnalyzer from './jdAnalyzer.js';
import { writeStory } from './llmClient.js';

function computeHighlightPoints(projectMetadata, jdMetadata) {
  const projectTech = [
    ...projectMetadata.tech_stack.language,
    ...projectMetadata.tech_stack.framework,
  ].map((s) => s.toLowerCase());

  const jdSkills = [...jdMetadata.required_skills, ...jdMetadata.preferred_skills];

  return Array.from(new Set(
    jdSkills.filter((skill) => projectTech.some((tech) => tech.includes(skill) || skill.includes(tech))),
  ));
}

function buildSlides({ projectMetadata, jdMetadata, matchingReason, sections }) {
  const techStackText = [...projectMetadata.tech_stack.language, ...projectMetadata.tech_stack.framework].join(', ')
    || '분석된 기술 스택 정보 없음';

  return [
    {
      title: projectMetadata.project_name,
      content: jdMetadata.position ? `${jdMetadata.position} 지원용 포트폴리오` : '맞춤형 포트폴리오',
      evidence: [],
    },
    {
      title: 'Project Overview',
      content: projectMetadata.description || '설명을 찾지 못했습니다.',
      evidence: projectMetadata.evidence.map((e) => e.file),
    },
    {
      title: 'Tech Stack',
      content: techStackText,
      evidence: projectMetadata.evidence.map((e) => e.file).filter((f) => f !== 'README.md'),
    },
    ...sections.map((section) => ({
      title: section.title,
      content: section.content,
      evidence: projectMetadata.evidence.map((e) => e.file),
    })),
    {
      title: '프로젝트 선정 이유',
      content: matchingReason,
      evidence: [],
    },
  ];
}

function renderMarp(slides) {
  const header = '---\nmarp: true\n---\n\n';
  const body = slides
    .map((slide) => `# ${slide.title}\n\n${slide.content}${slide.evidence.length ? `\n\n_Evidence: ${slide.evidence.join(', ')}_` : ''}`)
    .join('\n\n---\n\n');
  return header + body;
}

/**
 * Repo URL + JD 텍스트 → 포트폴리오 결과 전체 파이프라인.
 * 02_USER_FLOW.md / 04_AI_AGENT_SPEC.md의 흐름을 단일 프로젝트 기준으로 단순화한 버전이다.
 */
export async function generatePortfolio({ repositoryUrl, jdText }) {
  const projectMetadata = await githubAnalyzer.analyze(repositoryUrl);
  const jdMetadata = jdAnalyzer.analyze(jdText);

  const highlightPoints = computeHighlightPoints(projectMetadata, jdMetadata);
  const { matchingReason, sections } = writeStory({ projectMetadata, jdMetadata, highlightPoints });

  const matchingResult = {
    selected_projects: [projectMetadata.project_name],
    highlight_points: highlightPoints,
    matching_reason: matchingReason,
  };

  const slides = buildSlides({ projectMetadata, jdMetadata, matchingReason, sections });
  const markdown = renderMarp(slides);

  const portfolio = {
    title: `${projectMetadata.project_name} 포트폴리오`,
    slides,
    markdown,
  };

  return { projectMetadata, jdMetadata, matchingResult, portfolio };
}
