import type {
  EvaluationQuery,
  QueryPhase,
  QuerySlice,
  RelevanceGrade,
} from '../contracts';

export const EXPLORATORY_QUERY_SET_HASH =
  '3384643d0d6eef83330720be5c76dcc2a7f29378b6f7afc4207ee956a2bbd183';

export const EXPLORATORY_QUERIES = [
  createQuery(
    'lexical-calibration-01',
    'React 폼 검증',
    'lexical',
    'calibration',
    {
      'dev-01': 2,
      'dev-02': 1,
      'dev-03': 1,
    }
  ),
  createQuery(
    'lexical-calibration-02',
    '캐시 무효화',
    'lexical',
    'calibration',
    {
      'dev-05': 2,
    }
  ),
  createQuery(
    'lexical-calibration-03',
    '출처 인용 체크리스트',
    'lexical',
    'calibration',
    {
      'study-04': 2,
      'media-05': 1,
    }
  ),
  createQuery(
    'lexical-calibration-04',
    '공모전 문제 정의',
    'lexical',
    'calibration',
    {
      'project-01': 2,
      'project-02': 1,
    }
  ),
  createQuery(
    'lexical-calibration-05',
    '제주 비 오는 날',
    'lexical',
    'calibration',
    {
      'travel-01': 2,
    }
  ),
  createQuery(
    'lexical-calibration-06',
    '기내 반입 보조배터리',
    'lexical',
    'calibration',
    {
      'travel-02': 2,
    }
  ),
  createQuery(
    'lexical-calibration-07',
    '팟캐스트 타임스탬프',
    'lexical',
    'calibration',
    {
      'media-04': 2,
      'media-08': 1,
    }
  ),
  createQuery(
    'lexical-calibration-08',
    '브라우저 북마크 내보내기',
    'lexical',
    'calibration',
    {
      'account-03': 2,
    }
  ),
  createQuery(
    'lexical-calibration-09',
    '복구 코드 2단계 인증',
    'lexical',
    'calibration',
    {
      'account-02': 2,
      'account-01': 1,
    }
  ),
  createQuery(
    'lexical-calibration-10',
    '비밀번호 관리자 이전',
    'lexical',
    'calibration',
    {
      'account-06': 2,
      'account-01': 1,
    }
  ),
  createQuery('lexical-check-01', 'Supabase RLS', 'lexical', 'check', {
    'dev-08': 2,
  }),
  createQuery('lexical-check-02', '오답 노트', 'lexical', 'check', {
    'study-11': 2,
  }),
  createQuery('lexical-check-03', '사용자 테스트 관찰', 'lexical', 'check', {
    'project-09': 2,
  }),
  createQuery('lexical-check-04', '여행 경비 정산', 'lexical', 'check', {
    'travel-10': 2,
  }),
  createQuery('lexical-check-05', '의심스러운 로그인', 'lexical', 'check', {
    'account-07': 2,
  }),
  createQuery(
    'semantic-calibration-01',
    '통신이 끊긴 동안 작성하던 것을 연결 뒤 자동으로 보내기',
    'semantic',
    'calibration',
    {
      'dev-06': 2,
      'account-04': 1,
    }
  ),
  createQuery(
    'semantic-calibration-02',
    '암호를 치지 않고 얼굴이나 지문으로 서비스 들어가기',
    'semantic',
    'calibration',
    {
      'account-01': 2,
      'account-06': 1,
    }
  ),
  createQuery(
    'semantic-calibration-03',
    '두 번째 확인 수단을 못 쓰는 때를 위한 일회용 열쇠',
    'semantic',
    'calibration',
    {
      'account-02': 2,
      'account-07': 1,
    }
  ),
  createQuery(
    'semantic-calibration-04',
    '시간이 부족한데 제품에서 제일 위험한 가정 하나만 확인하기',
    'semantic',
    'calibration',
    {
      'project-04': 2,
      'project-06': 1,
    }
  ),
  createQuery(
    'semantic-calibration-05',
    '상대의 경험을 왜곡하지 않고 듣는 면담 방법',
    'semantic',
    'calibration',
    {
      'project-03': 2,
      'project-09': 1,
    }
  ),
  createQuery(
    'semantic-calibration-06',
    '학술 자료를 전부 정독하기 전에 채택 여부 가늠하기',
    'semantic',
    'calibration',
    {
      'study-03': 2,
      'study-04': 1,
    }
  ),
  createQuery(
    'semantic-calibration-07',
    '정답을 가린 채 머릿속에서 배운 것을 꺼내는 연습',
    'semantic',
    'calibration',
    {
      'study-02': 2,
      'study-01': 1,
    }
  ),
  createQuery(
    'semantic-calibration-08',
    '연결편 사이에 국경 수속까지 포함한 최소 여유',
    'semantic',
    'calibration',
    {
      'travel-03': 2,
      'travel-02': 1,
    }
  ),
  createQuery(
    'semantic-calibration-09',
    '우천 시 걷는 구간을 줄인 제주도 하루 일정',
    'semantic',
    'calibration',
    {
      'travel-01': 2,
      'travel-07': 1,
    }
  ),
  createQuery(
    'semantic-calibration-10',
    '말 한마디 단서로 재생 지점을 찾아가기',
    'semantic',
    'calibration',
    {
      'media-08': 2,
      'media-04': 1,
    }
  ),
  createQuery(
    'semantic-check-01',
    '각자 다른 화폐로 낸 돈을 공평하게 나누는 방법',
    'semantic',
    'check',
    {
      'travel-10': 2,
    }
  ),
  createQuery(
    'semantic-check-02',
    '한산한 골목을 자연광 좋은 시간에 촬영하기',
    'semantic',
    'check',
    {
      'travel-09': 2,
      'media-03': 1,
    }
  ),
  createQuery(
    'semantic-check-03',
    '새 장비로 바꾸기 전 저장한 웹 주소들을 옮길 파일 만들기',
    'semantic',
    'check',
    {
      'account-03': 2,
      'account-10': 1,
    }
  ),
  createQuery(
    'semantic-check-04',
    '모임 뒤 책임질 사람과 마감 시점을 적어 두기',
    'semantic',
    'check',
    {
      'project-10': 2,
      'project-05': 1,
    }
  ),
  createQuery(
    'semantic-check-05',
    '읽은 내용을 근거와 반대 의견으로 짧게 압축하기',
    'semantic',
    'check',
    {
      'media-01': 2,
      'study-12': 1,
    }
  ),
  createQuery(
    'negative-calibration-01',
    '고양이 예방접종 일정',
    'negative',
    'calibration',
    {}
  ),
  createQuery(
    'negative-calibration-02',
    '주식 양도소득세 신고',
    'negative',
    'calibration',
    {}
  ),
  createQuery(
    'negative-calibration-03',
    '집에서 천연 발효빵 굽기',
    'negative',
    'calibration',
    {}
  ),
  createQuery(
    'negative-calibration-04',
    '자동차 엔진오일 교체 주기',
    'negative',
    'calibration',
    {}
  ),
  createQuery(
    'negative-calibration-05',
    '이력서 연봉 협상 문구',
    'negative',
    'calibration',
    {}
  ),
  createQuery(
    'negative-calibration-06',
    '아기 이유식 알레르기 순서',
    'negative',
    'calibration',
    {}
  ),
  createQuery(
    'negative-calibration-07',
    '실내 화분 진딧물 제거',
    'negative',
    'calibration',
    {}
  ),
  createQuery(
    'negative-calibration-08',
    '웨딩 촬영 드레스 예약',
    'negative',
    'calibration',
    {}
  ),
  createQuery(
    'negative-calibration-09',
    '중고 자전거 체인 수리',
    'negative',
    'calibration',
    {}
  ),
  createQuery(
    'negative-calibration-10',
    '전세 계약 등기부 확인',
    'negative',
    'calibration',
    {}
  ),
  createQuery(
    'negative-check-01',
    '강아지 사료 급여량',
    'negative',
    'check',
    {}
  ),
  createQuery(
    'negative-check-02',
    '부가가치세 세금계산서',
    'negative',
    'check',
    {}
  ),
  createQuery(
    'negative-check-03',
    '김치 냉장고 냄새 청소',
    'negative',
    'check',
    {}
  ),
  createQuery(
    'negative-check-04',
    '마라톤 무릎 통증 훈련',
    'negative',
    'check',
    {}
  ),
  createQuery(
    'negative-check-05',
    '부모님 건강검진 예약',
    'negative',
    'check',
    {}
  ),
] as const satisfies readonly EvaluationQuery[];

function createQuery(
  id: string,
  text: string,
  slice: QuerySlice,
  phase: QueryPhase,
  relevanceByInsightId: Readonly<Record<string, RelevanceGrade>>
): EvaluationQuery {
  return {
    id,
    text,
    slice,
    phase,
    relevanceByInsightId,
  };
}
