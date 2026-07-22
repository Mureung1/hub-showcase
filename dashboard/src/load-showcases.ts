import type { Project } from './App';

type Fetcher = (input: RequestInfo | URL) => Promise<Response>;

type ShowcaseData = {
  projects: Project[];
};

export async function loadShowcases(
  fetcher: Fetcher = fetch,
  url = './data/showcases.json',
): Promise<Project[]> {
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`프로젝트 자료를 불러오지 못했습니다: ${response.status}`);
  }

  const data = (await response.json()) as Partial<ShowcaseData>;
  if (!Array.isArray(data.projects)) {
    throw new Error('프로젝트 자료 형식이 올바르지 않습니다.');
  }

  return data.projects;
}
