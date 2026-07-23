/**
 * GitHub 저장소 정보 조회 및 요약 서비스
 * LLM과 통합하여 한국어 요약 생성
 */

import { PrismaClient } from '@prisma/client'
import { llmService } from './llmService'

const prisma = new PrismaClient()

interface GithubRepoData {
  id: number
  owner: string
  name: string
  fullName: string
  description?: string
  url: string
  stars: number
  forks: number
  openIssues: number
  language?: string
  topics: string[]
  license?: string
  homepageUrl?: string
}

interface RepoWithSummary extends GithubRepoData {
  readme?: string
  summary?: string
  summaryBullets?: string[]
}

class GithubService {
  /**
   * GitHub API로 인기 저장소 검색 (별 순)
   */
  async fetchTrendingRepos(language?: string, limit: number = 20): Promise<GithubRepoData[]> {
    const query = language ? `language:${language} stars:>1000` : 'stars:>1000'
    const token = process.env.GITHUB_TOKEN ? `&Authorization: token ${process.env.GITHUB_TOKEN}` : ''

    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
      query
    )}&sort=stars&order=desc&per_page=${limit}`

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(token && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }),
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    const data = (await response.json()) as {
      items: Array<{
        id: number
        owner: { login: string }
        name: string
        full_name: string
        description: string | null
        html_url: string
        stargazers_count: number
        forks_count: number
        open_issues_count: number
        language: string | null
        topics: string[]
        license: { name: string } | null
        homepage: string | null
      }>
    }

    return data.items.map(item => ({
      id: item.id,
      owner: item.owner.login,
      name: item.name,
      fullName: item.full_name,
      description: item.description || undefined,
      url: item.html_url,
      stars: item.stargazers_count,
      forks: item.forks_count,
      openIssues: item.open_issues_count,
      language: item.language || undefined,
      topics: item.topics || [],
      license: item.license?.name || undefined,
      homepageUrl: item.homepage || undefined,
    }))
  }

  /**
   * GitHub 저장소의 README 파일 가져오기
   */
  async fetchReadme(owner: string, repo: string): Promise<string | null> {
    const token = process.env.GITHUB_TOKEN
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3.raw',
      ...(token && { 'Authorization': `token ${token}` }),
    }

    // 여러 경로 시도
    const paths = ['README.md', 'readme.md', 'README', 'Readme.md']

    for (const path of paths) {
      try {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
        const response = await fetch(url, { headers })

        if (response.ok) {
          return await response.text()
        }
      } catch (error) {
        // 다음 경로 시도
        continue
      }
    }

    return null
  }

  /**
   * 저장소 정보 요약 (README + 메타데이터)
   */
  async summarizeRepo(repo: RepoWithSummary): Promise<{
    summary: string
    bullets: string[]
  }> {
    const content = `
제목: ${repo.name}
설명: ${repo.description || 'N/A'}
주언어: ${repo.language || 'Unknown'}
별: ${repo.stars}개
포크: ${repo.forks}개

${repo.readme ? `README 내용:\n${repo.readme}` : ''}
    `

    // LLM으로 요약 생성
    const summaryResponse = await llmService.summarizeReadme(content)
    const bulletsResponse = await llmService.extractBulletPoints(content, 4)

    return {
      summary: summaryResponse.success ? summaryResponse.content : repo.description || '',
      bullets: bulletsResponse,
    }
  }

  /**
   * 저장소 정보 및 요약을 DB에 저장
   */
  async saveRepo(repo: RepoWithSummary): Promise<void> {
    const { summary, bullets } = await this.summarizeRepo(repo)

    await prisma.githubRepo.upsert({
      where: { githubId: repo.id },
      create: {
        githubId: repo.id,
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description || null,
        url: repo.url,
        stars: repo.stars,
        forks: repo.forks,
        openIssues: repo.openIssues,
        language: repo.language || null,
        topics: repo.topics,
        license: repo.license || null,
        homepageUrl: repo.homepageUrl || null,
        readme: repo.readme || null,
        summary,
        summaryBullets: bullets,
        lastFetchedAt: new Date(),
      },
      update: {
        stars: repo.stars,
        forks: repo.forks,
        openIssues: repo.openIssues,
        description: repo.description || null,
        readme: repo.readme || null,
        summary,
        summaryBullets: bullets,
        lastFetchedAt: new Date(),
      },
    })

    console.log(`✅ Saved: ${repo.fullName}`)
  }

  /**
   * 인기 저장소 수집 및 요약 (일괄 처리)
   */
  async collectAndSummarizeRepos(language?: string, limit: number = 20): Promise<void> {
    console.log(`📥 Fetching ${limit} trending repos...`)

    // GitHub에서 인기 repo 목록 조회
    const repos = await this.fetchTrendingRepos(language, limit)

    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i]!

      try {
        console.log(`[${i + 1}/${repos.length}] Processing ${repo.fullName}...`)

        // README 파일 가져오기
        const readme = await this.fetchReadme(repo.owner, repo.name)

        // DB에 저장 및 요약 생성
        await this.saveRepo({
          ...repo,
          readme: readme || undefined,
        })

        // API 레이트 제한 고려 (0.5초 간격)
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`❌ Error processing ${repo.fullName}:`, error)
        continue
      }
    }

    console.log('✅ Collection completed')
  }

  /**
   * DB에서 인기 저장소 조회
   */
  async getTrendingRepos(limit: number = 20): Promise<any[]> {
    return prisma.githubRepo.findMany({
      take: limit,
      orderBy: { stars: 'desc' },
    })
  }

  /**
   * 언어별 인기 저장소 조회
   */
  async getReposByLanguage(language: string, limit: number = 10): Promise<any[]> {
    return prisma.githubRepo.findMany({
      where: { language },
      take: limit,
      orderBy: { stars: 'desc' },
    })
  }

  /**
   * 저장소 상세 조회 (ID로)
   */
  async getRepoById(githubId: number): Promise<any> {
    return prisma.githubRepo.findUnique({
      where: { githubId },
    })
  }

  /**
   * 저장소 검색
   */
  async searchRepos(query: string, limit: number = 10): Promise<any[]> {
    return prisma.githubRepo.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { summary: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { stars: 'desc' },
    })
  }
}

export const githubService = new GithubService()
