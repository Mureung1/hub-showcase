import { fetchBlobContent } from './githubClient.js';
import { parseReadme, emptyProjectOverview } from './readmeParser.js';
import { buildFixedContext } from './stubData.js';

/**
 * README fetch + 파싱을 조합하는 오케스트레이션 레이어.
 * tech_stack(의존성 사전 매핑)은 아직 별도 작업 범위라 stubData.js의
 * 스텁 값을 계속 재사용하고, project_overview/sources만 실제 값으로 채운다.
 */
export async function buildContext(owner, repo, contextFilePaths) {
  const stub = buildFixedContext();
  const readmeFile = contextFilePaths.find(
    (f) => f.path.split('/').pop().toLowerCase() === 'readme.md'
  );

  if (!readmeFile) {
    return { ...stub, project_overview: emptyProjectOverview(), sources: [] };
  }

  const content = await fetchBlobContent(owner, repo, readmeFile.sha);
  if (content === null) {
    return { ...stub, project_overview: emptyProjectOverview(), sources: [] };
  }

  return { ...stub, project_overview: parseReadme(content), sources: ['README.md'] };
}
