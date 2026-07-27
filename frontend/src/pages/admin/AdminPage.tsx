import { useEffect, useState } from 'react'
import { ApiError } from '../../api/httpClient'
import { getDiscordChannels } from '../../features/discord/api/discordApi'
import type { DiscordChannel } from '../../features/discord/types/discordTypes'
import { CategorySettingsStep } from '../../features/notice-config/components/CategorySettingsStep'
import { CompleteStep } from '../../features/notice-config/components/CompleteStep'
import { DeleteNoticeConfigModal } from '../../features/notice-config/components/DeleteNoticeConfigModal'
import { GuidePanel } from '../../features/notice-config/components/GuidePanel'
import { SiteRegistrationStep } from '../../features/notice-config/components/SiteRegistrationStep'
import { submitSelectorHelpRequestMock } from '../../features/notice-config/api/mockNoticeConfigApi'
import {
  deleteNoticeConfig,
  getNoticeConfig,
  replaceNoticeConfig,
  saveNoticeConfig,
  testNoticeConfigCrawl,
  updateNoticeCategories,
} from '../../features/notice-config/api/noticeConfigApi'
import type {
  AdminStep,
  SaveStatus,
} from '../../features/notice-config/types/adminFlowTypes'
import type {
  DetectedCategory,
  NoticeConfigForm,
  NoticePreview,
  SelectorHelpRequest,
} from '../../features/notice-config/types/noticeConfigTypes'
import './admin.css'

const selectorGuideUrl =
  import.meta.env.VITE_SELECTOR_GUIDE_URL ||
  'https://app.notion.com/p/Selector-39f020cdef3e80a8a0a0fc968bcb6068'

const initialForm: NoticeConfigForm = {
  siteName: '',
  url: '',
  listSelector: '',
  titleSelector: '',
  linkSelector: '',
  dateSelector: '',
  categorySelector: '',
  categoryListSelector: '',
}

interface AdminPageProps {
  guildId: string
}

function AdminPage({ guildId }: AdminPageProps) {
  const [step, setStep] = useState<AdminStep>('site')
  const [form, setForm] = useState<NoticeConfigForm>(initialForm)
  const [notices, setNotices] = useState<NoticePreview[]>([])
  const [categories, setCategories] = useState<DetectedCategory[]>([])
  const [discordChannels, setDiscordChannels] = useState<DiscordChannel[]>([])
  const [isLoadingChannels, setIsLoadingChannels] = useState(true)
  const [channelLoadError, setChannelLoadError] = useState<string | null>(null)
  const [hasExistingConfig, setHasExistingConfig] = useState(false)
  const [hasSavedConfig, setHasSavedConfig] = useState(false)
  const [hasRetestedSite, setHasRetestedSite] = useState(false)
  const [isCrawling, setIsCrawling] = useState(false)
  const [crawlError, setCrawlError] = useState<string | null>(null)
  const [categoryStepHint, setCategoryStepHint] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const updateForm = (field: keyof NoticeConfigForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const resetNoticeConfigFlow = () => {
    setStep('site')
    setNotices([])
    setCategories([])
    setHasExistingConfig(false)
    setHasSavedConfig(false)
    setHasRetestedSite(false)
    setCategoryStepHint(null)
    setSaveStatus('idle')
    setSaveError(null)
  }

  useEffect(() => {
    let isCurrent = true

    async function loadNoticeConfig() {
      try {
        const noticeConfig = await getNoticeConfig(guildId)

        if (!isCurrent) {
          return
        }

        setForm(noticeConfig.form)
        setCategories(noticeConfig.categories)
        setHasExistingConfig(true)
        setHasSavedConfig(true)
        setHasRetestedSite(false)
        setStep('categories')
        setSaveStatus('saved')
      } catch {
        if (isCurrent) {
          setHasExistingConfig(false)
          setHasSavedConfig(false)
          setHasRetestedSite(false)
        }
      }
    }

    void loadNoticeConfig()

    return () => {
      isCurrent = false
    }
  }, [guildId])

  useEffect(() => {
    let isCurrent = true

    async function loadDiscordChannels() {
      setIsLoadingChannels(true)
      setChannelLoadError(null)

      try {
        const channels = await getDiscordChannels(guildId)

        if (!isCurrent) {
          return
        }

        setDiscordChannels(channels)
      } catch {
        if (isCurrent) {
          setChannelLoadError('Discord 채널 목록을 불러오지 못했습니다.')
        }
      } finally {
        if (isCurrent) {
          setIsLoadingChannels(false)
        }
      }
    }

    void loadDiscordChannels()

    return () => {
      isCurrent = false
    }
  }, [guildId])

  const handleTestCrawl = async () => {
    setIsCrawling(true)
    setCrawlError(null)

    try {
      const result = await testNoticeConfigCrawl(guildId, form)

      setNotices(result.notices)
      setCategories(fillMissingChannelIds(result.categories, discordChannels))
      setCategoryStepHint(null)
      setHasRetestedSite(true)
      setSaveStatus('dirty')
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setCrawlError('사이트 정보와 Selector를 모두 입력한 뒤 테스트 크롤링을 실행해주세요.')
        return
      }

      setCrawlError(getErrorMessage(error, '테스트 크롤링에 실패했습니다. 입력값을 확인해주세요.'))
    } finally {
      setIsCrawling(false)
    }
  }

  const updateCategory = (
    categoryName: string,
    field: keyof Pick<DetectedCategory, 'roleName' | 'isActive'>,
    value: string | boolean,
  ) => {
    setCategories((current) =>
      current.map((category) =>
        category.name === categoryName
          ? {
              ...category,
              [field]: value,
            }
          : category,
      ),
    )
    setSaveStatus('dirty')
    setSaveError(null)
  }

  const updateNotificationChannel = (channelId: string) => {
    setCategories((current) =>
      current.map((category) => ({
        ...category,
        channelId,
      })),
    )
    setSaveStatus('dirty')
    setSaveError(null)
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    setSaveError(null)
    const normalizedCategories = syncCategoryChannelIds(categories, getNotificationChannelId(categories))

    try {
      if (hasExistingConfig) {
        if (hasRetestedSite) {
          await replaceNoticeConfig(guildId, { form, categories: normalizedCategories })
          await syncSavedNoticeConfig()
        } else {
          const result = await updateNoticeCategories(guildId, normalizedCategories)

          setCategories(result.categories)
        }
      } else {
        await saveNoticeConfig(guildId, { form, categories: normalizedCategories })
        setHasExistingConfig(true)
        await syncSavedNoticeConfig()
      }

      setHasSavedConfig(true)
      setHasRetestedSite(false)
      setSaveStatus('saved')
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        resetNoticeConfigFlow()
        setCrawlError('기존 설정이 삭제되었습니다. 사이트 등록부터 다시 진행해주세요.')
        return
      }

      setSaveStatus('error')
      setSaveError(getErrorMessage(error, '저장에 실패했습니다. 입력값을 확인해주세요.'))
    }
  }

  const syncSavedNoticeConfig = async () => {
    const noticeConfig = await getNoticeConfig(guildId)

    setForm(noticeConfig.form)
    setCategories(noticeConfig.categories)
  }

  const handleSelectorHelpRequest = async (request: SelectorHelpRequest) => {
    await submitSelectorHelpRequestMock(request)
  }

  const openDeleteModal = () => {
    setDeleteError(null)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    if (isDeleting) {
      return
    }

    setIsDeleteModalOpen(false)
    setDeleteError(null)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError(null)

    try {
      await deleteNoticeConfig(guildId)
      setIsDeleteModalOpen(false)
      resetNoticeConfigFlow()
      setCrawlError('기존 설정이 삭제되었습니다. 사이트 등록부터 다시 진행해주세요.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setIsDeleteModalOpen(false)
        resetNoticeConfigFlow()
        setCrawlError('기존 설정이 이미 삭제되었습니다. 사이트 등록부터 다시 진행해주세요.')
        return
      }

      setDeleteError(getErrorMessage(error, '설정 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.'))
    } finally {
      setIsDeleting(false)
    }
  }

  const openCategoryStep = () => {
    if (categories.length === 0) {
      setStep('site')
      setCategoryStepHint('테스트 크롤링 후 이동할 수 있습니다.')
      return
    }

    setCategoryStepHint(null)
    setStep('categories')
  }

  const renderMain = () => {
    if (step === 'site') {
      return (
        <SiteRegistrationStep
          form={form}
          isCrawling={isCrawling}
          crawlError={crawlError}
          notices={notices}
          categories={categories}
          selectorGuideUrl={selectorGuideUrl}
          onFormChange={updateForm}
          onTestCrawl={handleTestCrawl}
          onNext={() => setStep('categories')}
          onSelectorHelpRequest={handleSelectorHelpRequest}
        />
      )
    }

    if (step === 'categories') {
      return (
        <CategorySettingsStep
          categories={categories}
          discordChannels={discordChannels}
          notificationChannelId={getNotificationChannelId(categories)}
          isLoadingChannels={isLoadingChannels}
          channelLoadError={channelLoadError}
          canGoNext={categories.length > 0 && hasSavedConfig}
          saveStatus={saveStatus}
          saveError={saveError}
          onNotificationChannelChange={updateNotificationChannel}
          onCategoryChange={updateCategory}
          onPrevious={() => setStep('site')}
          onSave={handleSave}
          onNext={() => setStep('complete')}
        />
      )
    }

    return (
      <CompleteStep
        siteName={form.siteName || 'IRIS Notice'}
        categories={categories}
        discordChannels={discordChannels}
        onRestart={() => setStep('site')}
      />
    )
  }

  return (
    <main className="admin-shell">
      <section className="admin-page">
        <aside className="admin-sidebar">
          <div className="admin-brand" aria-label="IRIS 관리자">
            <span aria-hidden="true">🌸</span>
            IRIS 관리자
          </div>
          <button
            className={step === 'site' ? 'side-item active' : 'side-item'}
            type="button"
            onClick={() => setStep('site')}
          >
            사이트 등록
          </button>
          <button
            className={step !== 'site' ? 'side-item active' : 'side-item'}
            type="button"
            onClick={openCategoryStep}
          >
            카테고리 설정
          </button>
          {categoryStepHint && <p className="side-hint">{categoryStepHint}</p>}
          {hasExistingConfig && (
            <button className="side-danger-item" type="button" onClick={openDeleteModal}>
              설정 삭제
            </button>
          )}
        </aside>

        <section className={step === 'complete' ? 'admin-content complete-content' : 'admin-content'}>
          {renderMain()}
        </section>

        {step !== 'complete' && <GuidePanel step={step} />}
      </section>

      {isDeleteModalOpen && (
        <DeleteNoticeConfigModal
          isDeleting={isDeleting}
          deleteError={deleteError}
          onClose={closeDeleteModal}
          onConfirm={handleDelete}
        />
      )}
    </main>
  )
}

export default AdminPage

function fillMissingChannelIds(categories: DetectedCategory[], channels: DiscordChannel[]) {
  const fallbackChannelId = channels[0]?.id || ''
  const channelIds = new Set(channels.map((channel) => channel.id))
  const notificationChannelId = categories.find((category) => channelIds.has(category.channelId))?.channelId || fallbackChannelId

  return categories.map((category) => ({
    ...category,
    channelId: notificationChannelId,
  }))
}

function getNotificationChannelId(categories: DetectedCategory[]) {
  return categories.find((category) => category.channelId)?.channelId || ''
}

function syncCategoryChannelIds(categories: DetectedCategory[], channelId: string) {
  return categories.map((category) => ({
    ...category,
    channelId,
  }))
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallbackMessage
}
