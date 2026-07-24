import { fetchBlobContent } from './githubClient.js';
import { parseReadme, emptyProjectOverview } from './readmeParser.js';
import { parsePackageJsonDependencies, parseDockerComposeImages } from './dependencyExtractor.js';
import { mapTechStack } from './techStackMapper.js';
import { detectLanguages } from './languageDetector.js';

/**
 * Context File(README/package.json/docker-compose.yml) fetch + 파싱을 조합하는
 * 오케스트레이션 레이어. project_overview는 README에서, tech_stack은 의존성
 * 이름을 뽑아 사전+LLM으로 분류한다(techStackMapper.js). 각 파일은 존재하고
 * fetch에 성공했을 때만 sources에 기록된다.
 */

function findContextFile(contextFilePaths, basename) {
  return contextFilePaths.find((f) => f.path.split('/').pop().toLowerCase() === basename);
}

export async function buildContext(owner, repo, contextFilePaths, candidateFilePaths) {
  const sources = [];

  let projectOverview = emptyProjectOverview();
  const readmeFile = findContextFile(contextFilePaths, 'readme.md');
  if (readmeFile) {
    const content = await fetchBlobContent(owner, repo, readmeFile.sha);
    if (content !== null) {
      projectOverview = parseReadme(content);
      sources.push('README.md');
    }
  }

  const dependencyNames = [];

  const packageJsonFile = findContextFile(contextFilePaths, 'package.json');
  if (packageJsonFile) {
    const content = await fetchBlobContent(owner, repo, packageJsonFile.sha);
    if (content !== null) {
      dependencyNames.push(...parsePackageJsonDependencies(content));
      sources.push('package.json');
    }
  }

  const dockerComposeFile = findContextFile(contextFilePaths, 'docker-compose.yml');
  if (dockerComposeFile) {
    const content = await fetchBlobContent(owner, repo, dockerComposeFile.sha);
    if (content !== null) {
      dependencyNames.push(...parseDockerComposeImages(content));
      sources.push('docker-compose.yml');
    }
  }

  const techStack = await mapTechStack(dependencyNames);
  techStack.language = detectLanguages(candidateFilePaths);

  return { project_overview: projectOverview, tech_stack: techStack, sources };
}
