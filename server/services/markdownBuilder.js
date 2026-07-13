/**
 * Day 1 Walking Skeleton: 마크다운 조립기.
 *
 * 06_INTERVIEW_WRITER.md 10장의 5개 섹션 구조(Project Overview / Tech Stack /
 * Key Implementation / Trouble Shooting / Summary)를 그대로 따르되, 지금은 톤 교정도
 * 서술 수위 조정도 하지 않고 유저 답변을 그대로 붙인다. Day 9에서 이 함수 내부만
 * Writer/Tone Agent 호출로 교체하면 되고, 상태 모양(state.messages)은 유지된다.
 *
 * 이 스텁은 content_type을 항상 'IMPLEMENTATION_INTRO'로 고정하므로 모든 답변이
 * Key Implementation에만 쌓인다 (Trouble Shooting 분기는 Day 8~9에서 실제 판정이 붙으면 동작).
 */

function renderProjectOverview(context) {
  const { service_description, key_features } = context.project_overview;
  const features = key_features.length ? key_features.map((f) => `- ${f}`).join('\n') : '- (없음)';
  return `## Project Overview\n\n${service_description || '(설명 없음)'}\n\n### 핵심 기능\n\n${features}`;
}

function renderTechStack(context) {
  const { language, framework, database, infra } = context.tech_stack;
  const line = (label, arr) => `- ${label}: ${arr.length ? arr.join(', ') : '없음'}`;
  return `## Tech Stack\n\n${line('Language', language)}\n${line('Framework', framework)}\n${line('Database', database)}\n${line('Infra', infra)}`;
}

function renderSection(title, messages) {
  if (messages.length === 0) return `## ${title}\n\n(아직 없음)`;
  const body = messages
    .map((m, i) => `### ${i + 1}. ${m.question}\n\n${m.answer}`)
    .join('\n\n');
  return `## ${title}\n\n${body}`;
}

function renderSummary(keyImplMessages, troubleMessages) {
  const titles = (list) => list.map((m) => m.question).join(', ') || '없음';
  return `## Summary\n\n핵심 구현 ${keyImplMessages.length}건 (${titles(keyImplMessages)}), 트러블슈팅 ${troubleMessages.length}건 (${titles(troubleMessages)}) 정리됨`;
}

export function buildMarkdown(state) {
  const keyImplMessages = state.messages.filter((m) => m.contentType === 'IMPLEMENTATION_INTRO');
  const troubleMessages = state.messages.filter((m) => m.contentType === 'PROBLEM_SOLVING');

  return [
    renderProjectOverview(state.context),
    renderTechStack(state.context),
    renderSection('Key Implementation', keyImplMessages),
    renderSection('Trouble Shooting', troubleMessages),
    renderSummary(keyImplMessages, troubleMessages),
  ].join('\n\n---\n\n');
}
