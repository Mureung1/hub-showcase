import {
  deleteJson,
  getJson,
  patchJson,
  postJson,
  putJson,
} from '../../../api/httpClient'
import type {
  DetectedCategory,
  NoticeConfigDraft,
  NoticeConfigForm,
  NoticePreview,
  TestCrawlResult,
} from '../types/noticeConfigTypes'

interface ApiResponse<T> {
  data: T
}

interface NoticeConfigSitePayload {
  name: string
  url: string
  listSelector: string
  titleSelector: string
  linkSelector: string
  dateSelector: string
  categorySelector: string
  categoryListSelector: string
}

interface NoticeConfigCategoryPayload {
  name: string
  channelId: string
  roleName?: string
  isActive: boolean
}

interface NoticeCategoryUpdatePayload {
  categoryId: number
  channelId: string
  roleName?: string
  isActive: boolean
}

interface TestCrawlResponse {
  notices: NoticePreview[]
  categories: string[]
}

interface NoticeConfigResponse {
  site: NoticeConfigSitePayload
  categories: Array<DetectedCategory & {
    categoryId: number
    roleId: string | null
  }>
}

interface MessageResponse {
  message: string
}

interface UpdateCategoriesResponse extends MessageResponse {
  categories: NoticeConfigResponse['categories']
}

export async function testNoticeConfigCrawl(
  guildId: string,
  form: NoticeConfigForm,
): Promise<TestCrawlResult> {
  const response = await postJson<ApiResponse<TestCrawlResponse>>(
    `/admin/${guildId}/notice-config/test`,
    toSitePayload(form),
  )

  return {
    notices: response.data.notices,
    categories: response.data.categories.map(toDetectedCategory),
  }
}

export async function getNoticeConfig(guildId: string) {
  const response = await getJson<ApiResponse<NoticeConfigResponse>>(
    `/admin/${guildId}/notice-config`,
  )

  return {
    form: toNoticeConfigForm(response.data.site),
    categories: response.data.categories,
  }
}

export async function saveNoticeConfig(guildId: string, draft: NoticeConfigDraft) {
  const response = await postJson<ApiResponse<MessageResponse>>(
    `/admin/${guildId}/notice-config`,
    toNoticeConfigPayload(draft),
  )

  return response.data
}

export async function replaceNoticeConfig(guildId: string, draft: NoticeConfigDraft) {
  const response = await putJson<ApiResponse<MessageResponse>>(
    `/admin/${guildId}/notice-config`,
    toNoticeConfigPayload(draft),
  )

  return response.data
}

export async function updateNoticeCategories(guildId: string, categories: DetectedCategory[]) {
  const response = await patchJson<ApiResponse<UpdateCategoriesResponse>>(
    `/admin/${guildId}/notice-config/categories`,
    {
      categories: categories.map(toCategoryUpdatePayload),
    },
  )

  return response.data
}

export async function deleteNoticeConfig(guildId: string) {
  const response = await deleteJson<ApiResponse<MessageResponse>>(
    `/admin/${guildId}/notice-config`,
  )

  return response.data
}

function toSitePayload(form: NoticeConfigForm): NoticeConfigSitePayload {
  return {
    name: form.siteName,
    url: form.url,
    listSelector: form.listSelector,
    titleSelector: form.titleSelector,
    linkSelector: form.linkSelector,
    dateSelector: form.dateSelector,
    categorySelector: form.categorySelector,
    categoryListSelector: form.categoryListSelector,
  }
}

function toNoticeConfigForm(site: NoticeConfigSitePayload): NoticeConfigForm {
  return {
    siteName: site.name,
    url: site.url,
    listSelector: site.listSelector,
    titleSelector: site.titleSelector,
    linkSelector: site.linkSelector,
    dateSelector: site.dateSelector,
    categorySelector: site.categorySelector,
    categoryListSelector: site.categoryListSelector,
  }
}

function toNoticeConfigPayload(draft: NoticeConfigDraft) {
  return {
    site: toSitePayload(draft.form),
    categories: draft.categories.map(toCategoryPayload),
  }
}

function toCategoryPayload(category: DetectedCategory): NoticeConfigCategoryPayload {
  return {
    name: category.name,
    channelId: category.channelId,
    roleName: category.roleName.trim() || undefined,
    isActive: category.isActive,
  }
}

function toCategoryUpdatePayload(category: DetectedCategory): NoticeCategoryUpdatePayload {
  if (!category.categoryId) {
    throw new Error('Category id is required to update notice categories')
  }

  return {
    categoryId: category.categoryId,
    channelId: category.channelId,
    roleName: category.roleName.trim() || undefined,
    isActive: category.isActive,
  }
}

function toDetectedCategory(name: string): DetectedCategory {
  return {
    name,
    channelId: '',
    roleName: `IRIS-${name}`,
    isActive: true,
  }
}
