export type BodyPart = '가슴' | '등' | '하체' | '어깨' | '코어';
export type Goal = '다이어트' | '벌크업' | '근력' | '입문';

export interface Course {
  id: string;
  title: string;
  bodyPart: BodyPart;
  goal: Goal;
  durationMin: number;
  level: '초급' | '중급' | '고급';
  trainer: string;
  description: string;
  thumbnailTone: 'red' | 'purple' | 'green' | 'yellow';
  /** 실제 운동 가이드 영상 URL (webm/mp4) — 추후 자체 VOD로 교체 가능 */
  videoUrl: string;
  cues: string[];
  warnings: string[];
  setsGuide: string[];
}

export interface MealLog {
  id: string;
  time: string;
  title: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  feedback: string;
  status: 'good' | 'warn' | 'info';
}

export interface GymTrainer {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  photoUrl: string;
}

export interface GymPlace {
  id: string;
  name: string;
  type: '골목 헬스장' | '1인 PT숍' | '개인 트레이너';
  distanceKm: number;
  rating: number;
  tags: string[];
  address: string;
  lat: number;
  lng: number;
  /** 내부 사진 (추후 네이버 연동 예정) */
  photos: string[];
  hours: string;
  price: string;
  equipment: string[];
  amenities: string[];
  trainers: GymTrainer[];
}

/** 가상 사용자 위치 (부산 부산진구 서면 인근) */
export const MOCK_USER_LOCATION = {
  lat: 35.1578,
  lng: 129.0592,
  label: '내 위치 (서면)',
} as const;

export const MOCK_COURSES: Course[] = [
  {
    id: 'c1',
    title: '초보 가슴 루틴 — 덤벨 프레스 마스터',
    bodyPart: '가슴',
    goal: '입문',
    durationMin: 18,
    level: '초급',
    trainer: '박코치',
    thumbnailTone: 'red',
    videoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/c/c0/Video_showing_how_to_perform_the_dumbbell_bench_press_and_the_dumbbell_incline_bench_press.webm',
    description:
      '덤벨 프레스 기본 셋업부터 자극 위치까지, 입문자가 혼자 따라가기 쉬운 가슴 가이드입니다.',
    cues: [
      '견갑골을 살짝 모은 뒤 가슴을 펴고 시작하세요.',
      '팔꿈치는 몸통에서 약 45도 각도를 유지합니다.',
      '내릴 때 가슴 중앙에 자극이 오는지 확인하세요.',
    ],
    warnings: [
      '손목이 꺾이지 않도록 덤벨을 수직으로 잡으세요.',
      '허리가 과도하게 뜨면 중량을 낮추세요.',
    ],
    setsGuide: ['워밍업 2세트', '본세트 3×10~12회', '휴식 60~90초'],
  },
  {
    id: 'c2',
    title: '하체 데이: 스쿼트 폼 교정',
    bodyPart: '하체',
    goal: '근력',
    durationMin: 24,
    level: '중급',
    trainer: '이코치',
    thumbnailTone: 'yellow',
    videoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/5/5c/Squat_-_exercise_demonstration_video.webm',
    description:
      '무릎·골반·코어 정렬을 중심으로 스쿼트 깊이와 힘을 안정적으로 만드는 교정 강좌입니다.',
    cues: [
      '발끝은 살짝 바깥, 무릎은 발끝 방향을 따라갑니다.',
      '내려갈 때 힙을 뒤로 밀며 체중을 발 전체에 분산하세요.',
      '올라올 때 발바닥으로 바닥을 밀어 올리세요.',
    ],
    warnings: [
      '무릎이 안쪽으로 모이면 즉시 멈춰 정렬을 다시 잡으세요.',
      '통증이 있으면 깊이를 줄이고 가동범위를 좁히세요.',
    ],
    setsGuide: ['빈바/맨몸 워밍업 2세트', '본세트 4×6~8회', '휴식 90~120초'],
  },
  {
    id: 'c3',
    title: '등 자극 집중 — 랫풀다운 & 시티드로우',
    bodyPart: '등',
    goal: '벌크업',
    durationMin: 22,
    level: '중급',
    trainer: '박코치',
    thumbnailTone: 'purple',
    videoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/0/03/Common_Lat_Pulldown_Mistakes.webm',
    description:
      '광배와 중부 승모에 자극을 모으는 풀 동작 가이드로, 벌크업 루틴의 밀도를 높입니다.',
    cues: [
      '손잡이를 당길 때 팔보다 팔꿈치가 먼저 내려오게 하세요.',
      '가슴을 들어 올리며 광배가 수축하는 느낌을 확인합니다.',
      '로우에서는 어깨가 앞으로 말리지 않게 유지하세요.',
    ],
    warnings: [
      '반동으로 당기지 마세요. 중량보다 수축이 우선입니다.',
      '목이 앞으로 과하게 나오면 시선만 전방을 유지하세요.',
    ],
    setsGuide: ['랫풀다운 3×10~12', '시티드로우 3×10', '휴식 60~75초'],
  },
  {
    id: 'c4',
    title: '다이어트 코어 15분 서킷',
    bodyPart: '코어',
    goal: '다이어트',
    durationMin: 15,
    level: '초급',
    trainer: '김코치',
    thumbnailTone: 'green',
    videoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/f/fa/Kettlebell_crush_grip_push-up.webm',
    description:
      '짧은 시간에 코어 안정성과 칼로리 소모를 동시에 잡는 입문용 서킷입니다.',
    cues: [
      '플랭크는 골반이 처지지 않게 복부를 조이세요.',
      '호흡을 멈추지 말고 동작마다 내쉬며 진행하세요.',
      '휴식은 최소화하고 폼이 무너지면 즉시 속도를 낮추세요.',
    ],
    warnings: [
      '허리 통증이 있으면 크런치를 중단하고 데드버그로 대체하세요.',
      '너무 빠르게 반복하면 목이 먼저 피곤해질 수 있습니다.',
    ],
    setsGuide: ['서킷 3라운드', '동작당 40초 / 휴식 20초', '라운드 간 60초'],
  },
  {
    id: 'c5',
    title: '어깨 안정화 — 사이드 레터럴 가이드',
    bodyPart: '어깨',
    goal: '입문',
    durationMin: 16,
    level: '초급',
    trainer: '이코치',
    thumbnailTone: 'yellow',
    videoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/7/7f/Squat_and_Frontal_Raise.webm',
    description:
      '측면 삼각근을 안전하게 자극하는 레터럴 레이즈 폼과 중량 선택법을 배웁니다.',
    cues: [
      '팔꿈치를 살짝 구부린 채 아령을 옆으로 들어 올리세요.',
      '어깨 높이까지만 올리고 승모가 먼저 올라오지 않게 합니다.',
      '내릴 때도 통제된 속도로 3초간 내려주세요.',
    ],
    warnings: [
      '너무 무거운 중량은 승모 개입을 키웁니다.',
      '어깨 충돌감이 있으면 각도를 낮추고 가동범위를 줄이세요.',
    ],
    setsGuide: ['워밍업 1세트', '본세트 3×12~15회', '휴식 45~60초'],
  },
  {
    id: 'c6',
    title: '벌크업 푸시 데이 풀 루틴',
    bodyPart: '가슴',
    goal: '벌크업',
    durationMin: 35,
    level: '고급',
    trainer: '김코치',
    thumbnailTone: 'red',
    videoUrl:
      'https://upload.wikimedia.org/wikipedia/commons/8/80/Incline_press_-_exercise_demonstration_video.webm',
    description:
      '벤치프레스·인클라인·플라이를 묶은 푸시 데이 구성으로 가슴·어깨·삼두를 밀도 있게 공략합니다.',
    cues: [
      '메인 리프트는 폭발적으로 올리고 천천히 내리세요.',
      '세트 간 호흡을 정리한 뒤 다음 세트로 들어가세요.',
      '보조근 개입이 커지면 그립과 각도를 다시 체크하세요.',
    ],
    warnings: [
      '워밍업 없이 고중량으로 바로 들어가지 마세요.',
      '어깨에 따끔한 통증이 있으면 인클라인 각도를 낮추세요.',
    ],
    setsGuide: [
      '벤치 4×6~8',
      '인클라인 덤벨 3×8~10',
      '플라이 3×12',
      '휴식 90초',
    ],
  },
];

export const MOCK_MEALS: MealLog[] = [
  {
    id: 'm1',
    time: '08:10',
    title: '그릭요거트 + 바나나',
    calories: 320,
    carbs: 42,
    protein: 18,
    fat: 8,
    feedback: '단백질 비율이 좋아요해요. 오전 운동 전 좋은 선택입니다.',
    status: 'good',
  },
  {
    id: 'm2',
    time: '12:40',
    title: '닭가슴살 샐러드',
    calories: 480,
    carbs: 28,
    protein: 42,
    fat: 16,
    feedback: '탄단지 균형이 안정적입니다. 채소 양을 조금 더 늘려보세요.',
    status: 'good',
  },
  {
    id: 'm3',
    time: '16:20',
    title: '아메리카노 + 쿠키',
    calories: 260,
    carbs: 34,
    protein: 3,
    fat: 12,
    feedback: '단순당 비중이 높아요. 다음엔 견과류로 바꿔보는 걸 추천합니다.',
    status: 'warn',
  },
  {
    id: 'm4',
    time: '19:30',
    title: '현미밥 + 소불고기',
    calories: 640,
    carbs: 68,
    protein: 32,
    fat: 22,
    feedback: '저녁 탄수화물이 다소 높습니다. 내일 하체 데이라면 괜찮아요.',
    status: 'info',
  },
];

export const MOCK_GYMS: GymPlace[] = [
  {
    id: 'g1',
    name: '골목핏 헬스',
    type: '골목 헬스장',
    distanceKm: 0.4,
    rating: 4.8,
    tags: ['여성전용존', 'PT가능'],
    address: '부산 부산진구 부전동',
    lat: 35.1586,
    lng: 129.0568,
    photos: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80',
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=900&q=80',
      'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=900&q=80',
    ],
    hours: '평일 06:00–23:00 · 주말 08:00–21:00',
    price: '월 회원 59,000원부터 · PT 회당 45,000원',
    equipment: ['스미스머신', '케이블', '덤벨 2–40kg', '러닝머신 6대'],
    amenities: ['여성전용존', '샤워실', '락커', '정수기'],
    trainers: [
      {
        id: 't1',
        name: '김서연',
        specialty: '입문 · 자세교정',
        bio: '혼자 운동하다 막힌 분께 기본기부터 차근히 알려드립니다.',
        photoUrl:
          'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&q=80',
      },
      {
        id: 't2',
        name: '박준호',
        specialty: '근력 · 벌크업',
        bio: '골목 헬스장 환경에 맞춘 효율 루틴을 설계합니다.',
        photoUrl:
          'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
      },
    ],
  },
  {
    id: 'g2',
    name: '한스 PT Studio',
    type: '1인 PT숍',
    distanceKm: 0.7,
    rating: 4.9,
    tags: ['자세교정', '입문특화'],
    address: '부산 부산진구 전포동',
    lat: 35.1561,
    lng: 129.0624,
    photos: [
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80',
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=900&q=80',
      'https://images.unsplash.com/photo-1599058945522-28d884b0b342?w=900&q=80',
    ],
    hours: '예약제 07:00–22:00 (매주 화 휴무)',
    price: 'PT 10회 420,000원 · 체험 1회 35,000원',
    equipment: ['파워랙', '케이블 크로스', '케틀벨', '폼롤러'],
    amenities: ['1:1 프라이빗', '주차 2대', '샤워'],
    trainers: [
      {
        id: 't3',
        name: '한지우',
        specialty: '자세교정 · 통증케어',
        bio: '데스크 직장인 라운드숄더·골반 불균형을 집중 케어합니다.',
        photoUrl:
          'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=400&q=80',
      },
      {
        id: 't4',
        name: '이도윤',
        specialty: '입문 특화',
        bio: '헬스장 입문이 부담스러운 분을 위한 쉬운 첫 수업을 진행합니다.',
        photoUrl:
          'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=400&q=80',
      },
    ],
  },
  {
    id: 'g3',
    name: '트레이너 최민수',
    type: '개인 트레이너',
    distanceKm: 1.1,
    rating: 4.7,
    tags: ['다이어트', '온라인상담'],
    address: '부산 부산진구 부암동',
    lat: 35.1612,
    lng: 129.0549,
    photos: [
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80',
      'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=900&q=80',
    ],
    hours: '협의 후 방문 · 평일 오전/저녁 가능',
    price: '방문 PT 회당 50,000원 · 온라인 상담 월 30,000원',
    equipment: ['밴드', '덤벨 세트', '매트', '심박밴드'],
    amenities: ['방문수업', '식단 피드백', '카카오 상담'],
    trainers: [
      {
        id: 't5',
        name: '최민수',
        specialty: '다이어트 · 생활습관',
        bio: '바쁜 일정에도 이어갈 수 있는 현실적인 감량 루틴을 만듭니다.',
        photoUrl:
          'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400&q=80',
      },
      {
        id: 't6',
        name: '정하린',
        specialty: '홈트 · 체형',
        bio: '공간·장비가 적어도 자극이 오는 홈 세션을 진행합니다.',
        photoUrl:
          'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=400&q=80',
      },
    ],
  },
  {
    id: 'g4',
    name: '동네짐 24',
    type: '골목 헬스장',
    distanceKm: 1.4,
    rating: 4.5,
    tags: ['24시', '주차가능'],
    address: '부산 부산진구 양정동',
    lat: 35.1671,
    lng: 129.0678,
    photos: [
      'https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=900&q=80',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80',
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=900&q=80',
    ],
    hours: '연중무휴 24시간',
    price: '월 회원 49,000원 · 일일권 12,000원',
    equipment: ['러닝머신 10대', '사이클', '프리웨이트', '스미스'],
    amenities: ['24시 출입', '주차', '샤워', '와이파이'],
    trainers: [
      {
        id: 't7',
        name: '오세진',
        specialty: '체력 · 컨디셔닝',
        bio: '야간·새벽 회원도 무리 없이 이어갈 컨디션 관리형 PT를 합니다.',
        photoUrl:
          'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=400&q=80',
      },
      {
        id: 't8',
        name: '윤채원',
        specialty: '하체 · 코어',
        bio: '스쿼트·힙 힌지 기본기를 안전하고 탄탄하게 잡아드립니다.',
        photoUrl:
          'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=400&q=80',
      },
    ],
  },
];

export const BODY_PARTS: Array<BodyPart | '전체'> = [
  '전체',
  '가슴',
  '등',
  '하체',
  '어깨',
  '코어',
];

export const GOALS: Array<Goal | '전체'> = [
  '전체',
  '다이어트',
  '벌크업',
  '근력',
  '입문',
];

export function getCourseById(id: string): Course | undefined {
  return MOCK_COURSES.find((course) => course.id === id);
}

export function getGymById(id: string): GymPlace | undefined {
  return MOCK_GYMS.find((gym) => gym.id === id);
}

export function getRelatedCourses(course: Course, limit = 3): Course[] {
  return MOCK_COURSES.filter(
    (item) =>
      item.id !== course.id &&
      (item.bodyPart === course.bodyPart || item.goal === course.goal),
  ).slice(0, limit);
}
