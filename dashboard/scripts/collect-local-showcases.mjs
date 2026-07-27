import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateShowcase } from './validate-showcase.mjs';

const IMAGE_PATTERN = /\.(webp|png|jpg|jpeg)$/i;

export function safeBranchName(branch) {
  if (
    typeof branch !== 'string' ||
    !/^[\p{L}\p{N}._/-]+$/u.test(branch) ||
    branch.startsWith('/') ||
    branch.endsWith('/') ||
    branch.includes('//') ||
    branch.includes('..') ||
    branch.includes('@{')
  ) {
    throw new Error(`허용하지 않은 브랜치 이름입니다: ${branch}`);
  }
  return branch;
}

function branchSlug(branch) {
  return branch.replaceAll('/', '-').replace(/[^A-Za-z0-9._-]/g, '-');
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function textList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
}

function normalizeAgent(agent) {
  if (!agent || typeof agent !== 'object' || Array.isArray(agent)) {
    return { summary: '', agentTools: [], workflows: [] };
  }

  const agentTools = [];
  const addTools = (items, type) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (typeof item === 'string' && item.trim()) {
        agentTools.push({ type, name: item.trim(), purpose: '' });
      } else if (item && typeof item === 'object') {
        const name = text(item.name);
        const purpose = text(item.purpose);
        if (name) agentTools.push({ type, name, purpose });
      }
    }
  };

  addTools(agent.agentTools, 'agent');
  addTools(agent.agents, 'agent');
  addTools(agent.skills, 'skill');

  const workflows = [];
  if (Array.isArray(agent.workflows)) {
    for (const workflow of agent.workflows) {
      if (typeof workflow === 'string' && workflow.trim()) {
        workflows.push({ name: '개발 Workflow', steps: [workflow.trim()] });
      } else if (workflow && typeof workflow === 'object') {
        const name = text(workflow.name) || '개발 Workflow';
        const steps = textList(workflow.steps);
        if (steps.length > 0) workflows.push({ name, steps });
      }
    }
  }

  return {
    summary: text(agent.summary),
    agentTools,
    workflows,
  };
}

function normalizeShowcase(input, branch) {
  const parsedAgent = normalizeAgent(input.agent);
  const providedTitle = text(input.title);
  const normalized = {
    schemaVersion: 1,
    title: providedTitle || `${branch} 프로젝트`,
    summary: text(input.summary),
    problem: text(input.problem),
    targetUsers: textList(input.targetUsers),
    features: textList(input.features),
    featureTags: textList(input.featureTags),
    techStack: textList(input.techStack),
    techHighlights: textList(input.techHighlights),
    githubUser: text(input.githubUser),
    demoUrl: text(input.demoUrl),
    demoVideoUrl: text(input.demoVideoUrl),
    thumbnail: text(input.thumbnail),
    screenshots: textList(input.screenshots),
    agent: parsedAgent,
    developmentWithAI: text(input.developmentWithAI),
  };

  const hasContent = [
    providedTitle,
    normalized.summary,
    normalized.problem,
    ...normalized.features,
    ...normalized.featureTags,
    ...normalized.techStack,
    normalized.agent.summary,
    ...normalized.agent.agentTools.map((tool) => `${tool.name}${tool.purpose}`),
    ...normalized.agent.workflows.flatMap((workflow) => [workflow.name, ...workflow.steps]),
    normalized.developmentWithAI,
  ].some(Boolean);

  if (!hasContent) return null;
  return normalized;
}

function qualityScore(project) {
  let score = 0;
  if (project.title) score += 2;
  if (project.summary) score += 2;
  if (project.problem) score += 2;
  if (project.features.length > 0) score += 2;
  if (project.featureTags.length > 0) score += 1;
  if (project.techStack.length > 0) score += 1;
  if (project.techHighlights.length > 0) score += 1;
  if (project.githubUser) score += 1;
  if (project.thumbnailUrl !== './dummy-thumbnail.svg') score += 1;
  if (project.agent.summary || project.agent.agentTools.length > 0 || project.agent.workflows.length > 0) score += 2;
  if (project.developmentWithAI) score += 1;
  return score;
}

function safeImagePath(relativePath) {
  if (
    typeof relativePath !== 'string' ||
    relativePath.startsWith('/') ||
    relativePath.includes('..') ||
    relativePath.includes('\\') ||
    !IMAGE_PATTERN.test(relativePath)
  ) {
    throw new Error(`허용하지 않은 이미지 경로입니다: ${relativePath}`);
  }
  return relativePath;
}

async function copyImage({ branch, relativePath, outputDir, slug, readBranchFile }) {
  const safePath = safeImagePath(relativePath);
  const content = await readBranchFile(branch, `showcase/${safePath}`);
  if (!content) {
    throw new Error(`${branch} 브랜치에서 showcase/${safePath} 파일을 찾지 못했습니다.`);
  }

  const publicPath = path.join(outputDir, 'showcases', slug, safePath);
  await mkdir(path.dirname(publicPath), { recursive: true });
  await writeFile(publicPath, content);
  return `./showcases/${slug}/${safePath}`;
}

function fillWithDummyProjects(projects, minimumCount = 16) {
  const result = [...projects];
  const template = projects[0];
  const thumbnailUrl = template?.thumbnailUrl ?? './dummy-thumbnail.svg';
  const screenshotUrls = template?.screenshotUrls?.length
    ? template.screenshotUrls
    : [thumbnailUrl];

  for (let index = 1; result.length < minimumCount; index += 1) {
    const number = String(index).padStart(2, '0');
    result.push({
      schemaVersion: 1,
      id: `dummy-${number}`,
      title: `화면 확인용 프로젝트 ${number}`,
      summary: '카드 배치를 확인하기 위한 더미 자료입니다.',
      category: '예시 자료',
      problem: '실제 프로젝트가 모이기 전 화면 구성을 확인합니다.',
      targetUsers: ['대시보드 제작자'],
      features: ['카드 배치 확인', '반응형 화면 확인'],
      featureTags: ['더미', '화면 확인'],
      techStack: ['React', 'Express'],
      techHighlights: [],
      githubUser: `dummy-${number}`,
      demoUrl: '',
      thumbnail: thumbnailUrl,
      screenshots: screenshotUrls,
      thumbnailUrl,
      screenshotUrls,
      sourceBranch: null,
      isDummy: true,
      agent: {
        summary: '화면 확인용 더미 자료입니다.',
        agents: [],
        skills: [],
        workflows: [],
      },
    });
  }

  return result;
}

export async function collectLocalShowcases({ branches, outputDir, readBranchFile }) {
  const projects = [];
  const errors = [];
  let skippedMissing = 0;
  let skippedInvalid = 0;

  await rm(path.join(outputDir, 'showcases'), { recursive: true, force: true });
  await mkdir(path.join(outputDir, 'data'), { recursive: true });

  for (const branch of branches) {
    const metadata = await readBranchFile(branch, 'showcase/showcase.json');
    if (!metadata) {
      skippedMissing += 1;
      continue;
    }

    try {
      const parsed = JSON.parse(metadata.toString('utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('showcase.json은 객체 형식이어야 합니다.');
      }

      const normalized = normalizeShowcase(parsed, branch);
      if (!normalized) throw new Error('표시할 프로젝트 내용이 없습니다.');

      const warnings = [];
      const validated = validateShowcase(parsed);
      if (!validated.ok) warnings.push('showcase.json 형식 확인 필요');

      const slug = branchSlug(branch);
      let thumbnailUrl = './dummy-thumbnail.svg';
      if (normalized.thumbnail) {
        try {
          thumbnailUrl = await copyImage({
            branch,
            relativePath: normalized.thumbnail,
            outputDir,
            slug,
            readBranchFile,
          });
        } catch {
          warnings.push('대표 이미지 확인 필요');
        }
      } else {
        warnings.push('대표 이미지 확인 필요');
      }

      const screenshotUrls = [];
      for (const screenshot of normalized.screenshots) {
        try {
          screenshotUrls.push(await copyImage({
            branch,
            relativePath: screenshot,
            outputDir,
            slug,
            readBranchFile,
          }));
        } catch {
          warnings.push('추가 화면 일부 확인 필요');
        }
      }

      projects.push({
        ...normalized,
        id: slug,
        sourceBranch: branch,
        thumbnailUrl,
        screenshotUrls,
        dataWarnings: [...new Set(warnings)],
      });
    } catch (error) {
      skippedInvalid += 1;
      errors.push({ branch, message: error instanceof Error ? error.message : String(error) });
    }
  }

  const rankedProjects = projects
    .map((project, index) => ({ project, index, score: qualityScore(project) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ project, score }) => ({ ...project, qualityScore: score }));
  const realProjectCount = rankedProjects.length;
  const displayProjects = fillWithDummyProjects(rankedProjects);
  const result = {
    generatedAt: new Date().toISOString(),
    projectCount: displayProjects.length,
    realProjectCount,
    dummyProjectCount: displayProjects.length - realProjectCount,
    projects: displayProjects,
    skippedMissing,
    skippedInvalid,
    errors,
  };

  await writeFile(
    path.join(outputDir, 'data', 'showcases.json'),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  );

  return result;
}

export function readGitBranchFile(repoDir, branch, filePath) {
  safeBranchName(branch);
  for (const ref of [branch, `origin/${branch}`]) {
    try {
      return execFileSync('git', ['-C', repoDir, 'show', `${ref}:${filePath}`], {
        encoding: 'buffer',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      // 다음 참조 형식으로 다시 시도합니다.
    }
  }
  return null;
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const dashboardDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const repoDir = path.resolve(dashboardDir, '..');
  const outputDir = path.join(dashboardDir, 'public');
  const args = process.argv.slice(2);
  const useActiveConfig = args.includes('--active');
  const branches = args.filter((arg) => arg !== '--active');
  let selectedBranches = branches;

  if (useActiveConfig) {
    const configPath = path.join(dashboardDir, 'config', 'active-showcases.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    if (!Array.isArray(config.branches) || config.branches.length === 0) {
      throw new Error('active-showcases.json에 branches 목록이 필요합니다.');
    }
    selectedBranches = config.branches;
  }

  if (selectedBranches.length === 0) {
    selectedBranches = ['dashboard-showcase-test'];
  }

  const result = await collectLocalShowcases({
    branches: selectedBranches,
    outputDir,
    readBranchFile: (branch, filePath) => readGitBranchFile(repoDir, branch, filePath),
  });

  console.log(`${result.projectCount}개 프로젝트를 수집했습니다.`);
  if (result.errors.length > 0) {
    console.warn(`자료가 올바르지 않아 ${result.errors.length}개 브랜치를 제외했습니다.`);
    console.warn(JSON.stringify(result.errors, null, 2));
  }
}
