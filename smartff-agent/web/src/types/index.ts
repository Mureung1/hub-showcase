// Common Types

export interface NavItem {
  id: string
  label: string
  href: string
  icon?: string
}

export interface KPIData {
  label: string
  value: string | number
  trend?: 'up' | 'down'
  trendPercent?: number
}

export interface RecommendationData {
  title: string
  type: 'opportunity' | 'risk'
  reason: string[]
  expectedEffect: string
}

export interface CategoryData {
  id: string
  name: string
  value: string | number
  trend?: number
}

export interface PageContextType {
  currentPage: 'dashboard' | 'analysis' | 'financial' | 'upload'
  setCurrentPage: (page: 'dashboard' | 'analysis' | 'financial' | 'upload') => void
}

// API Response Types (Future use)
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface UploadResponse {
  fileId: string
  fileName: string
  status: 'pending' | 'processing' | 'success' | 'error'
  uploadedAt: string
  rowCount: number
}

export interface SalesData {
  date: string
  category: string
  quantity: number
  revenue: number
}

export interface WasteData {
  date: string
  category: string
  quantity: number
  reason: string
}

export interface RecommendationResponse {
  recommendationId: string
  category: string
  recommendedQuantity: number
  currentQuantity: number
  confidence: number
  reasoning: string[]
}
