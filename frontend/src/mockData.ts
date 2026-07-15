export interface PodiumItem {
  name: string;
  accuracy: string;
  points: string;
  reward: string;
  avatar: string;
}

export interface LeaderboardItem {
  rank: string;
  name: string;
  accuracy: string;
  points: string;
  trend: 'up' | 'down' | 'same';
}

export interface LeaderboardPeriod {
  podium: PodiumItem[];
  list: LeaderboardItem[];
}

export const MOCK_RANKINGS: Record<'current' | 'last', LeaderboardPeriod> = {
  current: {
    podium: [
      { name: '@minu', accuracy: '99.4%', points: '14,200 pts', reward: 'naver pay 50,000 krw', avatar: '🥇' },
      { name: '@jieun', accuracy: '97.8%', points: '12,500 pts', reward: 'starbucks voucher', avatar: '🥈' },
      { name: '@sohee', accuracy: '96.5%', points: '11,100 pts', reward: 'starbucks voucher', avatar: '🥉' }
    ],
    list: [
      { rank: '04', name: '@jungsik', accuracy: '95.2%', points: '9,800 pts', trend: 'up' },
      { rank: '05', name: '@subin', accuracy: '94.8%', points: '9,550 pts', trend: 'down' },
      { rank: '06', name: '@kyeongmin', accuracy: '93.7%', points: '9,200 pts', trend: 'same' },
      { rank: '07', name: '@yebin', accuracy: '93.1%', points: '9,050 pts', trend: 'up' },
      { rank: '08', name: '@woohyun', accuracy: '92.6%', points: '8,800 pts', trend: 'down' },
      { rank: '09', name: '@eunjin', accuracy: '92.3%', points: '8,700 pts', trend: 'up' },
      { rank: '10', name: '@daehyun', accuracy: '92.0%', points: '8,500 pts', trend: 'same' }
    ]
  },
  last: {
    podium: [
      { name: '@subin', accuracy: '98.9%', points: '13,800 pts', reward: 'naver pay 50,000 krw', avatar: '🥇' },
      { name: '@minu', accuracy: '97.1%', points: '12,100 pts', reward: 'starbucks voucher', avatar: '🥈' },
      { name: '@jungsik', accuracy: '96.8%', points: '11,900 pts', reward: 'starbucks voucher', avatar: '🥉' }
    ],
    list: [
      { rank: '04', name: '@jieun', accuracy: '95.9%', points: '10,100 pts', trend: 'up' },
      { rank: '05', name: '@sohee', accuracy: '94.0%', points: '9,200 pts', trend: 'down' },
      { rank: '06', name: '@woohyun', accuracy: '93.5%', points: '9,000 pts', trend: 'same' },
      { rank: '07', name: '@kyeongmin', accuracy: '92.8%', points: '8,900 pts', trend: 'up' },
      { rank: '08', name: '@daehyun', accuracy: '92.1%', points: '8,400 pts', trend: 'down' },
      { rank: '09', name: '@yebin', accuracy: '91.8%', points: '8,200 pts', trend: 'up' },
      { rank: '10', name: '@eunjin', accuracy: '91.5%', points: '8,000 pts', trend: 'same' }
    ]
  }
};
