// 오늘의 미션 데이터(트랙 1 §2) — 필라이즈의 AI 미션(하루 1개, 부족 영양소 기반)을 본떴지만, 여기선
// AI 호출이 아니라 순수 데이터 + 결정적 선택(src/lib/missions.js)이다. 어떤 문구를 어떤 상황에
// 보여줄지는 이 파일에만 있고, 화면/로직은 이 데이터를 가져다 쓰기만 한다 —
// src/data/coupangProducts.js가 src/utils/adRecommendation.js와 분리된 것과 같은 계약.
//
// trigger 값은 nutrition.js의 DEFICIENCY_TARGET_KEYS(carbs/protein/fat/fiber) 중 하나거나,
// 'sodium-exceeded'(나트륨 상한 초과) | 'no-record'(오늘 아직 기록 없음) | 'all-satisfied'(전부 충족,
// 정보성 — 완료 체크 대상이 없다) 중 하나다. id는 한 번 정하면 바꾸지 않는다(추후 완료 이력을 저장하게
// 되면 이 id가 키가 된다).
//
// 문구 규칙(src/lib/prompts/dietAnalysis.js §7과 동일): "~병 위험", "치료가 필요합니다" 같은 질병
// 진단·치료 표현은 쓰지 않는다 — 어디까지나 습관 제안이다. src/lib/missions.test.js가 이 규칙을
// 카탈로그 전체에 대해 강제한다(check:ads가 coupangProducts.js를 지키는 것과 같은 방식).
export const MISSIONS = [
  // ── protein: 단백질 부족 ──
  { id: 'protein-1', trigger: 'protein', title: '단백질 충전 한 끼', description: '다음 끼니에 두부·달걀·닭가슴살 중 하나를 더해보세요.' },
  { id: 'protein-2', trigger: 'protein', title: '간식도 단백질로', description: '우유나 그릭요거트를 오늘 간식으로 골라보세요.' },
  { id: 'protein-3', trigger: 'protein', title: '콩 단백질 챙기기', description: '국이나 반찬에 두부·콩나물을 곁들여보세요.' },
  { id: 'protein-4', trigger: 'protein', title: '고기 반찬 한 젓가락 더', description: '다음 식사에서 고기·생선 반찬을 한 젓가락 더 드셔보세요.' },
  { id: 'protein-5', trigger: 'protein', title: '견과류 한 줌', description: '간식으로 아몬드나 견과류 한 줌을 더해보세요.' },

  // ── fiber: 식이섬유 부족 ──
  { id: 'fiber-1', trigger: 'fiber', title: '채소 반찬 하나 더', description: '다음 끼니에 나물이나 샐러드를 하나 추가해보세요.' },
  { id: 'fiber-2', trigger: 'fiber', title: '과일로 마무리', description: '식사 후 과일 한 조각을 곁들여보세요.' },
  { id: 'fiber-3', trigger: 'fiber', title: '잡곡밥으로 바꿔보기', description: '흰쌀밥 대신 잡곡밥을 골라보세요.' },
  { id: 'fiber-4', trigger: 'fiber', title: '국물보다 건더기', description: '국·찌개를 먹을 때 건더기를 더 챙겨보세요.' },
  { id: 'fiber-5', trigger: 'fiber', title: '해조류 반찬', description: '미역이나 다시마 반찬을 곁들여보세요.' },

  // ── carbs: 탄수화물 부족 ──
  { id: 'carbs-1', trigger: 'carbs', title: '밥 한 숟갈 더', description: '다음 끼니에 밥이나 면을 평소보다 조금 더 드셔보세요.' },
  { id: 'carbs-2', trigger: 'carbs', title: '든든한 아침', description: '아침에 빵이나 죽처럼 가벼운 탄수화물을 챙겨보세요.' },
  { id: 'carbs-3', trigger: 'carbs', title: '고구마·감자 간식', description: '간식으로 고구마나 감자를 골라보세요.' },
  { id: 'carbs-4', trigger: 'carbs', title: '과일 간식', description: '간식으로 바나나나 사과 같은 과일을 더해보세요.' },
  { id: 'carbs-5', trigger: 'carbs', title: '잡곡·현미 챙기기', description: '잡곡밥이나 현미밥으로 탄수화물을 채워보세요.' },

  // ── fat: 지방 부족 ──
  { id: 'fat-1', trigger: 'fat', title: '견과류·아보카도', description: '샐러드나 간식에 견과류나 아보카도를 더해보세요.' },
  { id: 'fat-2', trigger: 'fat', title: '등푸른 생선', description: '다음 끼니에 고등어·연어 같은 생선을 골라보세요.' },
  { id: 'fat-3', trigger: 'fat', title: '조리유 한 스푼', description: '나물 무칠 때 참기름이나 들기름을 살짝 더해보세요.' },
  { id: 'fat-4', trigger: 'fat', title: '요거트·치즈', description: '간식으로 그릭요거트나 치즈를 곁들여보세요.' },
  { id: 'fat-5', trigger: 'fat', title: '올리브유 한 스푼', description: '요리에 올리브유를 한 스푼 더해보세요.' },

  // ── sodium-exceeded: 나트륨 이미 상한 초과 ──
  { id: 'sodium-1', trigger: 'sodium-exceeded', title: '국물은 반만', description: '남은 끼니에서는 국물을 반만 드셔보세요.' },
  { id: 'sodium-2', trigger: 'sodium-exceeded', title: '짠 반찬 줄이기', description: '찌개·젓갈처럼 짠 반찬은 오늘 남은 시간엔 피해보세요.' },
  { id: 'sodium-3', trigger: 'sodium-exceeded', title: '소스는 따로', description: '소스나 양념은 찍어 먹는 방식으로 양을 줄여보세요.' },
  { id: 'sodium-4', trigger: 'sodium-exceeded', title: '물 자주 마시기', description: '오늘 남은 시간엔 물을 자주 마셔보세요.' },
  { id: 'sodium-5', trigger: 'sodium-exceeded', title: '젓갈 대신 나물', description: '짠 밑반찬 대신 담백한 나물을 골라보세요.' },

  // ── no-record: 오늘 아직 기록 없음 ──
  { id: 'no-record-1', trigger: 'no-record', title: '오늘 첫 끼니 기록하기', description: '사진 한 장으로 오늘의 첫 기록을 시작해보세요.' },
  { id: 'no-record-2', trigger: 'no-record', title: '방금 먹은 것부터', description: '방금 드신 음식이 있다면 지금 기록해보세요.' },
  { id: 'no-record-3', trigger: 'no-record', title: '가볍게 시작하기', description: '메뉴 이름만 입력해도 분석할 수 있어요.' },
  { id: 'no-record-4', trigger: 'no-record', title: '간단하게 남기기', description: '오늘 먹은 메뉴 이름만 적어도 기록이 남아요.' },

  // ── all-satisfied: 목표 영양소를 전부 충족(정보성 — 완료 체크 없음) ──
  { id: 'all-satisfied-1', trigger: 'all-satisfied', title: '오늘처럼만', description: '오늘은 영양 균형이 좋아요. 이 페이스를 유지해보세요.' },
  { id: 'all-satisfied-2', trigger: 'all-satisfied', title: '잘하고 있어요', description: '탄수화물·단백질·지방·식이섬유를 고루 채웠어요.' },
  { id: 'all-satisfied-3', trigger: 'all-satisfied', title: '좋은 흐름이에요', description: '이대로 다음 끼니도 편하게 즐겨보세요.' },
  { id: 'all-satisfied-4', trigger: 'all-satisfied', title: '균형 잡힌 하루', description: '필요한 영양소를 골고루 채운 하루예요.' },
]

// 완료 여부를 판정할 수 없는(체크 대상이 아닌) 정보성 트리거.
export const INFO_ONLY_TRIGGERS = new Set(['all-satisfied'])
