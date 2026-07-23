export interface NoticeConfigForm {
  siteName: string
  url: string
  listSelector: string
  titleSelector: string
  linkSelector: string
  dateSelector: string
  categorySelector: string
  categoryListSelector: string
}

export interface NoticePreview {
  title: string
  link: string
  date: string
  category: string
}

export interface DetectedCategory {
  categoryId?: number
  name: string
  channelId: string
  roleId?: string | null
  roleName: string
  isActive: boolean
}

export interface TestCrawlResult {
  notices: NoticePreview[]
  categories: DetectedCategory[]
}

export interface NoticeConfigDraft {
  form: NoticeConfigForm
  categories: DetectedCategory[]
}

export interface SelectorHelpRequest {
  email: string
  siteName: string
  url: string
}
