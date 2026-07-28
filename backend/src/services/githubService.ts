/**
 * GitHub 저장소 정보 조회 및 요약 서비스
 * LLM과 통합하여 한국어 요약 생성
 */

import { PrismaClient } from '@prisma/client'
import { llmService } from './llmService.js'

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
   * GitHub API로 저장소 검색 (필터별)
   * @param filter - 'trending' (별 순), 'recent' (최근), 'active' (활발)
   * @param language - 프로그래밍 언어 필터
   */
  async fetchReposByFilter(
    filter: 'trending' | 'recent' | 'active' = 'trending',
    language?: string,
    limit: number = 300
  ): Promise<GithubRepoData[]> {
    let query = language ? `language:${language}` : ''
    let sortBy = 'stars'
    let orderBy = 'desc'

    // 필터별 조건 추가
    switch (filter) {
      case 'trending':
        // 별 1000개 이상 (많은 순)
        query += (query ? ' ' : '') + 'stars:>1000'
        sortBy = 'stars'
        orderBy = 'desc'
        break
      case 'recent':
        // 최근 2개월 내 생성되고 별 1000개 이상 (최신순)
        query += (query ? ' ' : '') + 'stars:>1000 created:>2026-05-27'
        sortBy = 'created'
        orderBy = 'desc'
        break
      case 'active':
        // 최근 2주 내 업데이트되고 별 1000개 이상 (최신순)
        query += (query ? ' ' : '') + 'stars:>1000 pushed:>2026-07-13'
        sortBy = 'updated'
        orderBy = 'desc'
        break
    }

    const token = process.env.GITHUB_TOKEN ? `&Authorization: token ${process.env.GITHUB_TOKEN}` : ''

    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
      query
    )}&sort=${sortBy}&order=${orderBy}&per_page=${limit}`

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
   * 인기 저장소 검색 (호환성 유지)
   */
  async fetchTrendingRepos(language?: string, limit: number = 300): Promise<GithubRepoData[]> {
    return this.fetchReposByFilter('trending', language, limit)
  }

  /**
   * 최근 저장소 검색
   */
  async fetchRecentRepos(language?: string, limit: number = 300): Promise<GithubRepoData[]> {
    try {
      // 먼저 DB에서 최근 저장소 조회
      const recentRepos = await prisma.githubRepo.findMany({
        where: language ? { language } : {},
        take: limit,
        orderBy: { createdAt: 'desc' },
      })
      if (recentRepos.length > 0) {
        return recentRepos.map(r => ({
          id: r.githubId,
          owner: r.owner,
          name: r.name,
          fullName: r.fullName,
          description: r.description || undefined,
          url: r.url,
          stars: r.stars,
          forks: r.forks,
          openIssues: r.openIssues,
          language: r.language || undefined,
          topics: r.topics,
          license: r.license || undefined,
          homepageUrl: r.homepageUrl || undefined,
        }))
      }
    } catch (error) {
      console.error('DB 조회 오류:', error)
    }
    // DB에 없으면 GitHub API 호출
    return this.fetchReposByFilter('recent', language, limit)
  }

  /**
   * 활발한 저장소 검색
   */
  async fetchActiveRepos(language?: string, limit: number = 300): Promise<GithubRepoData[]> {
    try {
      // 먼저 DB에서 활발한 저장소 조회
      const activeRepos = await prisma.githubRepo.findMany({
        where: language ? { language } : {},
        take: limit,
        orderBy: { updatedAt: 'desc' },
      })
      if (activeRepos.length > 0) {
        return activeRepos.map(r => ({
          id: r.githubId,
          owner: r.owner,
          name: r.name,
          fullName: r.fullName,
          description: r.description || undefined,
          url: r.url,
          stars: r.stars,
          forks: r.forks,
          openIssues: r.openIssues,
          language: r.language || undefined,
          topics: r.topics,
          license: r.license || undefined,
          homepageUrl: r.homepageUrl || undefined,
        }))
      }
    } catch (error) {
      console.error('DB 조회 오류:', error)
    }
    // DB에 없으면 GitHub API 호출
    return this.fetchReposByFilter('active', language, limit)
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
   * 저장소 정보를 DB에 즉시 저장 (요약 없이)
   */
  async saveRepo(repo: RepoWithSummary): Promise<void> {
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
        summary: null,  // LLM 요약은 나중에 생성
        summaryBullets: [],
        lastFetchedAt: new Date(),
      },
      update: {
        stars: repo.stars,
        forks: repo.forks,
        openIssues: repo.openIssues,
        description: repo.description || null,
        readme: repo.readme || null,
        lastFetchedAt: new Date(),
      },
    })

    console.log(`✅ Saved: ${repo.fullName}`)
  }

  /**
   * 저장소에 LLM 요약 추가 (백그라운드 작업)
   */
  async generateSummaryForRepo(githubId: number): Promise<void> {
    const repo = await prisma.githubRepo.findUnique({
      where: { githubId },
    })

    if (!repo || repo.summary) return  // 이미 요약이 있으면 스킵

    try {
      const { summary, bullets } = await this.summarizeRepo({
        id: repo.id as any,
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description || undefined,
        url: repo.url,
        stars: repo.stars,
        forks: repo.forks,
        openIssues: repo.openIssues,
        language: repo.language || undefined,
        topics: repo.topics,
        license: repo.license || undefined,
        homepageUrl: repo.homepageUrl || undefined,
        readme: repo.readme || undefined,
      })

      await prisma.githubRepo.update({
        where: { githubId },
        data: {
          summary,
          summaryBullets: bullets,
        },
      })

      console.log(`📝 Summary generated: ${repo.fullName}`)
    } catch (error) {
      console.error(`❌ Failed to generate summary for ${repo.fullName}:`, error)
    }
  }

  /**
   * 인기 저장소 수집 및 요약 (일괄 처리)
   */
  async collectAndSummarizeRepos(language?: string, limit: number = 300): Promise<void> {
    console.log(`📥 Fetching ${limit} trending repos...`)

    // GitHub에서 인기 repo 목록 조회
    const repos = await this.fetchTrendingRepos(language, limit)

    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i]!

      try {
        console.log(`[${i + 1}/${repos.length}] Processing ${repo.fullName}...`)

        // README 파일 가져오기
        const readme = await this.fetchReadme(repo.owner, repo.name)

        // DB에 즉시 저장 (요약 제외)
        await this.saveRepo({
          ...repo,
          readme: readme || undefined,
        })

        // 레이트 제한 고려 (최소 대기만)
        await new Promise(resolve => setTimeout(resolve, 50))
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
  async getTrendingRepos(limit: number = 300): Promise<any[]> {
    return prisma.githubRepo.findMany({
      take: limit,
      orderBy: { stars: 'desc' },
    })
  }

  /**
   * 언어별 인기 저장소 조회
   */
  async getReposByLanguage(language: string, limit: number = 300): Promise<any[]> {
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
  async searchRepos(query: string, limit: number = 300): Promise<any[]> {
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
