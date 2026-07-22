import type {
  DetectedCategory,
  NoticeConfigDraft,
  NoticeConfigForm,
  SelectorHelpRequest,
  TestCrawlResult,
} from '../types/noticeConfigTypes'
import type { DiscordChannel } from '../../discord/types/discordTypes'

export const mockDiscordChannels: DiscordChannel[] = [
  { id: 'channel-academic', name: '#학사-공지' },
  { id: 'channel-scholarship', name: '#장학-공지' },
  { id: 'channel-career', name: '#취업-공지' },
  { id: 'channel-event', name: '#행사-공지' },
  { id: 'channel-general', name: '#기타-공지' },
]

const mockDetectedCategories: DetectedCategory[] = [
  {
    name: '학사공지',
    channelId: 'channel-academic',
    roleName: 'Iris-학사공지',
    isActive: true,
  },
  {
    name: '장학공지',
    channelId: 'channel-scholarship',
    roleName: 'Iris-장학공지',
    isActive: true,
  },
  {
    name: '취업공지',
    channelId: 'channel-career',
    roleName: 'Iris-취업공지',
    isActive: true,
  },
  {
    name: '행사공지',
    channelId: 'channel-event',
    roleName: 'Iris-행사공지',
    isActive: true,
  },
  {
    name: '기타공지',
    channelId: 'channel-general',
    roleName: 'Iris-기타공지',
    isActive: false,
  },
]

export async function testCrawlMock(_form: NoticeConfigForm): Promise<TestCrawlResult> {
  void _form
  await delay(450)

  return {
    notices: [
      {
        title: '2026학년도 2학기 수강신청 일정 안내',
        link: 'https://example.ac.kr/notices/2026-course-registration',
        date: '2026-07-16',
        category: '학사공지',
      },
      {
        title: '교내 근로 장학생 추가 모집 안내',
        link: 'https://example.ac.kr/notices/work-scholarship',
        date: '2026-07-15',
        category: '장학공지',
      },
      {
        title: '하계 현장실습 참여 기업 설명회 안내',
        link: 'https://example.ac.kr/notices/internship-session',
        date: '2026-07-14',
        category: '취업공지',
      },
    ],
    categories: mockDetectedCategories,
  }
}

export async function saveNoticeConfigMock(_draft: NoticeConfigDraft): Promise<void> {
  void _draft
  await delay(360)
}

export async function submitSelectorHelpRequestMock(
  _request: SelectorHelpRequest,
): Promise<void> {
  void _request
  await delay(360)
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
