// [MOCK DATA] 상대 팀 상세 화면 레이아웃 확인용 더미 데이터.
// 다음 단계(7-1-b)에서 실제 API(GET /dating-teams/:teamId 등)로 교체 예정.
// 실제 연동 시에는 이 파일과 TeamMatchDetailPage.jsx의 더미 데이터 참조 부분만 걷어내면 된다.
export const DUMMY_TEAM_DETAIL = {
  teamName: '미소',
  matchPercent: 92,
  members: [
    {
      id: 1,
      name: '기우',
      age: 23,
      hobbyPrimaryType: '카페투어',
      hobbySecondaryType: '전시관람',
      idealTypePrimaryType: '다정한 리더형',
      idealTypeSecondaryType: '유머러스형',
      avatarColor: 'peach',
    },
    {
      id: 2,
      name: '서준',
      age: 24,
      hobbyPrimaryType: '전시관람',
      hobbySecondaryType: '산책',
      idealTypePrimaryType: '차분한 경청형',
      idealTypeSecondaryType: '계획형',
      avatarColor: 'mint',
    },
    {
      id: 3,
      name: '하율',
      age: 23,
      hobbyPrimaryType: '산책',
      hobbySecondaryType: '카페투어',
      idealTypePrimaryType: '활발한 리더형',
      idealTypeSecondaryType: '다정한 경청형',
      avatarColor: 'blue',
    },
  ],
}
