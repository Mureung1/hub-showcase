export type FeatureIconName = 'bell' | 'hash' | 'search' | 'slash'

export interface FeatureCard {
  title: string
  description: string
  icon: FeatureIconName
}

export interface GuideCard {
  step: string
  title: string
  description: string
}

export const featureCards: FeatureCard[] = [
  {
    title: '실시간 공지 알림',
    description: '새로운 공지가 올라오면 Discord에서 바로 알림을 받습니다.',
    icon: 'bell',
  },
  {
    title: '카테고리 알림',
    description: '관심 카테고리를 구독하고 역할 멘션 알림을 받습니다.',
    icon: 'hash',
  },
  {
    title: '키워드 알림',
    description: '관심 키워드가 포함된 제목의 공지를 개인 DM으로 받습니다.',
    icon: 'search',
  },
  {
    title: "('/') 슬래시 명령어",
    description: 'Discord에서 간편하게 키워드와 카테고리 구독을 관리합니다.',
    icon: 'slash',
  },
]

export const guideCards: GuideCard[] = [
  {
    step: '01',
    title: '사전 준비',
    description: 'Discord에 가입하고 공지 알림을 받을 서버와 채널을 준비합니다.',
  },
  {
    step: '02',
    title: '봇 초대하기',
    description: 'Discord 봇 초대하기 버튼으로 IRIS Bot을 서버에 추가하고 필요한 권한을 승인합니다.',
  },
  {
    step: '03',
    title: '/setup 입력',
    description: '봇을 초대한 서버에서 관리자 권한으로 /setup 명령어를 입력합니다.',
  },
  {
    step: '04',
    title: '관리자 페이지 접속',
    description: 'IRIS Bot이 보내준 링크로 관리자 설정 페이지에 접속합니다.',
  },
]
