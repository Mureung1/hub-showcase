import { useEffect, useMemo, useState } from 'react'
import { getDiscordChannels } from '../../features/discord/api/discordApi'
import type { DiscordChannel } from '../../features/discord/types/discordTypes'
import { CategorySettingsStep } from '../../features/notice-config/components/CategorySettingsStep'
import { CompleteStep } from '../../features/notice-config/components/CompleteStep'
import { GuidePanel } from '../../features/notice-config/components/GuidePanel'
import { SiteRegistrationStep } from '../../features/notice-config/components/SiteRegistrationStep'
import {
  saveNoticeConfigMock,
  submitSelectorHelpRequestMock,
  testCrawlMock,
} from '../../features/notice-config/api/mockNoticeConfigApi'
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
  const [isCrawling, setIsCrawling] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const activeCategories = useMemo(
    () => categories.filter((category) => category.isActive),
    [categories],
  )

  const updateForm = (field: keyof NoticeConfigForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

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
    const result = await testCrawlMock(form)
    setNotices(result.notices)
    setCategories(fillMissingChannelIds(result.categories, discordChannels))
    setSaveStatus('dirty')
    setIsCrawling(false)
  }

  const updateCategory = (
    categoryName: string,
    field: keyof Pick<DetectedCategory, 'channelId' | 'roleName' | 'isActive'>,
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
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    await saveNoticeConfigMock({ form, categories })
    setSaveStatus('saved')
  }

  const handleSelectorHelpRequest = async (request: SelectorHelpRequest) => {
    await submitSelectorHelpRequestMock(request)
  }

  const renderMain = () => {
    if (step === 'site') {
      return (
        <SiteRegistrationStep
          form={form}
          isCrawling={isCrawling}
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
          isLoadingChannels={isLoadingChannels}
          channelLoadError={channelLoadError}
          saveStatus={saveStatus}
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
        activeCategories={activeCategories}
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
            onClick={() => setStep(categories.length > 0 ? 'categories' : 'site')}
          >
            카테고리 설정
          </button>
        </aside>

        <section className={step === 'complete' ? 'admin-content complete-content' : 'admin-content'}>
          {renderMain()}
        </section>

        {step !== 'complete' && <GuidePanel step={step} />}
      </section>
    </main>
  )
}

export default AdminPage

function fillMissingChannelIds(categories: DetectedCategory[], channels: DiscordChannel[]) {
  const fallbackChannelId = channels[0]?.id || ''
  const channelIds = new Set(channels.map((channel) => channel.id))

  return categories.map((category) => ({
    ...category,
    channelId: channelIds.has(category.channelId) ? category.channelId : fallbackChannelId,
  }))
}
