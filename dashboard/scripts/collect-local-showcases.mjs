import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateShowcase } from './validate-showcase.mjs';

const IMAGE_PATTERN = /\.(webp|png|jpg|jpeg)$/i;

function safeBranchName(branch) {
  if (!/^[A-Za-z0-9._/-]+$/.test(branch)) {
    throw new Error(`허용하지 않은 브랜치 이름입니다: ${branch}`);
  }
  return branch;
}

function branchSlug(branch) {
  return branch.replaceAll('/', '-').replace(/[^A-Za-z0-9._-]/g, '-');
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
  const thumbnailUrl = template?.thumbnailUrl ?? './dummy-thumbnail.webp';
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
      const validated = validateShowcase(parsed);
      if (!validated.ok) {
        throw new Error(validated.errors.join('\n'));
      }

      const slug = branchSlug(branch);
      const thumbnailUrl = await copyImage({
        branch,
        relativePath: parsed.thumbnail,
        outputDir,
        slug,
        readBranchFile,
      });
      const screenshotUrls = [];
      for (const screenshot of parsed.screenshots ?? []) {
        screenshotUrls.push(
          await copyImage({
            branch,
            relativePath: screenshot,
            outputDir,
            slug,
            readBranchFile,
          }),
        );
      }

      projects.push({
        ...parsed,
        id: slug,
        sourceBranch: branch,
        thumbnailUrl,
        screenshotUrls,
      });
    } catch (error) {
      skippedInvalid += 1;
      errors.push({ branch, message: error instanceof Error ? error.message : String(error) });
    }
  }

  const realProjectCount = projects.length;
  const displayProjects = fillWithDummyProjects(projects);
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
  try {
    return execFileSync('git', ['-C', repoDir, 'show', `${branch}:${filePath}`], {
      encoding: 'buffer',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const branches = process.argv.slice(2);
  const selectedBranches = branches.length > 0 ? branches : ['dashboard-showcase-test'];
  const dashboardDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const repoDir = path.resolve(dashboardDir, '..');
  const outputDir = path.join(dashboardDir, 'public');

  const result = await collectLocalShowcases({
    branches: selectedBranches,
    outputDir,
    readBranchFile: (branch, filePath) => readGitBranchFile(repoDir, branch, filePath),
  });

  console.log(`${result.projectCount}개 프로젝트를 수집했습니다.`);
  if (result.errors.length > 0) {
    console.error(JSON.stringify(result.errors, null, 2));
    process.exitCode = 1;
  }
}
