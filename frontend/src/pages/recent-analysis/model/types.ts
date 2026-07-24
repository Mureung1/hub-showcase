export type AnalysisCategory = 'market' | 'stock' | 'risk' | 'term'

export type AnalysisCategoryFilter = 'all' | AnalysisCategory

export interface RecentAnalysisItem {
  id: string
  category: AnalysisCategory
  title: string
  description: string
  tags: string[]
  relativeTime: string
}
