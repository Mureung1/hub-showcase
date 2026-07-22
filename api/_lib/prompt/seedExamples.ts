import type { ScenarioId } from '../../../src/entities/message/index.js'
import {
  requirePromptExamplePair,
  type PromptExamplePair,
  type ReviewedPromptExampleSet,
} from './examples.js'

export const reviewedSeedCatalogVersion = 'reviewed-seeds-v1'

const reviewedSeedSources: Readonly<Record<ScenarioId, readonly ReviewedPromptExampleSet[]>> = {
  groupwork: [
    {
      catalogVersion: reviewedSeedCatalogVersion,
      exampleId: 'reviewed-groupwork-reply-ask-01',
      mode: 'reply',
      scenarioId: 'groupwork',
      purpose: 'ask',
      situation:
        '과제 분담 후 마감(이번 주 금요일) 이틀 전인데 팀원이 맡은 파트를 시작도 안 함. 취합·정리 시간을 생각하면 목요일까지는 받아야 함. 이번이 처음이 아님',
      receivedMessage: '미안 나 이번 주 진짜 바빠서 ㅠ 다음 주에 몰아서 할게',
      candidates: [
        {
          toneLevel: 1,
          text: '바쁜 건 알겠는데 마감이 금요일이라 다음 주는 늦어. 맡은 파트 어디까지 할 수 있는지 오늘 중으로 알려줘, 그래야 나머지 계획을 잡을 수 있어.',
        },
        {
          toneLevel: 2,
          text: '바쁜 건 알겠어! 근데 마감이 이번 주 금요일이라 다음 주면 늦을 것 같아 ㅠ 맡은 파트 어디까지 가능할지 오늘 알려줄 수 있어?',
        },
        {
          toneLevel: 3,
          text: '마감이 금요일이라 다음 주는 안 돼. 맡은 파트는 목요일까지 끝내줘야 하고, 어려우면 지금 말해줘. 오늘 중으로 답 부탁해.',
        },
      ],
    },
    {
      catalogVersion: reviewedSeedCatalogVersion,
      exampleId: 'reviewed-groupwork-initiate-suggest-01',
      mode: 'initiate',
      scenarioId: 'groupwork',
      purpose: 'suggest',
      situation:
        '발표 2주 전인데 첫 회의가 아직 안 잡힘. 내가 가능한 시간은 목요일 저녁과 금요일 오후. 단톡방이 조용한 상태에서 먼저 일정을 제안',
      candidates: [
        {
          toneLevel: 1,
          text: '얘들아, 발표까지 2주 남아서 이번 주에는 첫 회의를 해야 할 것 같아. 목요일 저녁이랑 금요일 오후 중에 되는 시간 답해줘!',
        },
        {
          toneLevel: 2,
          text: '얘들아 안녕! 발표가 2주밖에 안 남아서 슬슬 시작하면 좋을 것 같아 ㅎㅎ 혹시 목요일 저녁이나 금요일 오후 중에 다들 시간 어때?',
        },
        {
          toneLevel: 3,
          text: '발표까지 2주라 더 미루면 힘들어. 이번 주에 첫 회의 하자. 목요일 저녁이랑 금요일 오후 중에 되는 시간 답해줘.',
        },
      ],
    },
  ],
  professor: [
    {
      catalogVersion: reviewedSeedCatalogVersion,
      exampleId: 'reviewed-professor-reply-suggest-01',
      mode: 'reply',
      scenarioId: 'professor',
      purpose: 'suggest',
      situation:
        'LMS 오류로 과제가 제출되지 않았고 조교에게 미확인 메일을 받음. 과제 파일은 기한 내 완성해 둔 상태',
      receivedMessage: '이번 주 과제 제출이 확인되지 않습니다. 확인 부탁드립니다.',
      candidates: [
        {
          toneLevel: 1,
          text: '안녕하세요 조교님, 연락 감사합니다. 기한 내에 과제를 업로드했는데 시스템 오류로 제출이 완료되지 않았던 것 같습니다. 완성해 둔 파일을 바로 보내드릴 수 있는데, 제출로 인정될 수 있을지 확인 부탁드립니다. 감사합니다.',
        },
        {
          toneLevel: 2,
          text: '안녕하세요 조교님, 알려주셔서 감사합니다. 확인해 보니 기한 내 과제를 업로드하는 과정에서 시스템 오류가 있었던 것으로 보입니다. 완성해 두었던 과제 파일은 바로 보내드릴 수 있는데, 혹시 제출로 인정될 수 있을지 검토해 주시면 감사하겠습니다. 번거롭게 해드려 죄송하며, 필요한 절차가 있다면 안내해 주시기 바랍니다. 감사합니다.',
        },
        {
          toneLevel: 3,
          text: '안녕하세요 조교님. 과제는 기한 내에 완성했으나 업로드 과정에서 오류가 있었던 것 같습니다. 완성본을 바로 보내드릴 수 있으니 제출로 인정될 수 있을지 확인 부탁드립니다. 감사합니다.',
        },
      ],
    },
    {
      catalogVersion: reviewedSeedCatalogVersion,
      exampleId: 'reviewed-professor-initiate-other-01',
      mode: 'initiate',
      scenarioId: 'professor',
      purpose: 'other',
      situation:
        '몸살이 심해 내일 수업에 못 갈 것 같아 미리 알림. 병원 진료 후 진료확인서 제출 예정',
      candidates: [
        {
          toneLevel: 1,
          text: '교수님 안녕하세요. 어제부터 몸살 기운이 심해져 내일 수업에 참석하기 어려울 것 같아 미리 연락드립니다. 병원 진료 후 진료확인서를 다음 수업 시간에 제출하겠습니다. 수업 내용은 자료로 보충하겠습니다. 감사합니다.',
        },
        {
          toneLevel: 2,
          text: '교수님 안녕하세요. 다름이 아니라 몸살 증세가 심해져 부득이하게 내일 수업에 참석하지 못할 것 같아 미리 말씀드리고자 메일 드립니다. 병원 진료 후 진료확인서를 발급받아 다음 수업 시간에 제출하도록 하겠습니다. 수업 내용은 자료와 필기를 통해 충실히 보충하겠습니다. 감사합니다.',
        },
        {
          toneLevel: 3,
          text: '교수님 안녕하세요. 몸살이 심해 내일 수업에 참석이 어려울 것 같아 미리 말씀드립니다. 진료확인서는 다음 수업 때 제출하겠습니다. 감사합니다.',
        },
      ],
    },
  ],
  senior: [
    {
      catalogVersion: reviewedSeedCatalogVersion,
      exampleId: 'reviewed-senior-reply-other-01',
      mode: 'reply',
      scenarioId: 'senior',
      purpose: 'other',
      situation:
        '학과 행사에서 두어 번 본 선배가 밥을 먹자고 먼저 연락. 나는 수요일과 금요일 점심이 가능. 반갑지만 아직 어려운 사이라 존댓말 수위가 애매함',
      receivedMessage: '우리 조만간 밥 한번 먹자~ 시간 될 때 알려줘!',
      candidates: [
        {
          toneLevel: 1,
          text: '네 선배! 연락 주셔서 감사해요 ㅎㅎ 저는 수요일이나 금요일 점심 괜찮은데, 선배는 언제가 편하세요?',
        },
        {
          toneLevel: 2,
          text: '네 선배님, 먼저 연락 주셔서 감사합니다! 저는 수요일이나 금요일 점심이 괜찮은데, 선배님 편하신 시간에 맞추겠습니다.',
        },
        {
          toneLevel: 3,
          text: '좋아요 선배! 저는 수요일이나 금요일 점심 가능해요. 되시는 날 알려주시면 그날로 확정할게요.',
        },
      ],
    },
    {
      catalogVersion: reviewedSeedCatalogVersion,
      exampleId: 'reviewed-senior-initiate-question-01',
      mode: 'initiate',
      scenarioId: 'senior',
      purpose: 'question',
      situation:
        '다음 학기 수강신청 전에, 그 과목을 들었던 같은 전공 선배에게 과제량과 난이도를 먼저 물어봄. 인사만 해 본 사이',
      candidates: [
        {
          toneLevel: 1,
          text: '선배 안녕하세요! 다음 학기 수강신청 준비하다가 여쭤보고 싶어서 연락드렸어요. 그 과목 들으셨다고 들었는데 과제량이나 난이도 어땠는지 알려주실 수 있나요? 감사합니다 ㅎㅎ',
        },
        {
          toneLevel: 2,
          text: '선배님 안녕하세요, 같은 과 후배입니다. 다음 학기 전공 수강을 고민 중인데 그 과목을 들으셨다고 들어서 여쭤보고 싶습니다. 시간 괜찮으실 때 과제량이나 난이도가 어땠는지 알려주실 수 있을까요? 감사합니다!',
        },
        {
          toneLevel: 3,
          text: '선배님 안녕하세요, 다음 학기에 그 과목 수강을 고민 중이라 여쭤봅니다. 과제량이랑 시험 난이도 두 가지만 알려주실 수 있을까요? 답변 주시면 결정에 큰 도움이 됩니다!',
        },
      ],
    },
  ],
  friend: [
    {
      catalogVersion: reviewedSeedCatalogVersion,
      exampleId: 'reviewed-friend-reply-apologize-01',
      mode: 'reply',
      scenarioId: 'friend',
      purpose: 'apologize',
      situation:
        '취준·과제로 바빠 연락이 뜸했더니 친한 친구가 서운함을 표현함. 관계를 회복하고 싶고, 이번 주말에 만나서 풀고 싶음',
      receivedMessage: '너 요즘 나한테 좀 무심한 것 같아. 서운해',
      candidates: [
        {
          toneLevel: 1,
          text: '말해줘서 고마워. 요즘 너무 정신없어서 연락 못 했는데 서운했겠다, 미안해. 이번 주말에 보면서 얘기하자!',
        },
        {
          toneLevel: 2,
          text: '미안해… 요즘 과제에 치여서 연락을 잘 못 했어. 서운하게 할 생각은 없었는데 네가 그렇게 느꼈다면 정말 미안해. 괜찮으면 이번 주말에 얼굴 보고 얘기하자.',
        },
        {
          toneLevel: 3,
          text: '서운하게 해서 미안해! 정신없다는 핑계로 소홀했던 거 맞아. 이번 주말에 시간 비워줘, 만나서 풀고 싶어.',
        },
      ],
    },
    {
      catalogVersion: reviewedSeedCatalogVersion,
      exampleId: 'reviewed-friend-initiate-suggest-01',
      mode: 'initiate',
      scenarioId: 'friend',
      purpose: 'suggest',
      situation:
        '과 행사에서 만나 번호를 교환한 상대가 마음에 들어서, 다음 날 먼저 연락해 이번 주(가능하면 금요일)에 만나자고 제안',
      candidates: [
        {
          toneLevel: 1,
          text: '안녕하세요, 어제 행사에서 봤던 사람이에요 ㅎㅎ 얘기 나눠서 즐거웠어요! 괜찮으면 이번 주에 커피 한잔 어때요?',
        },
        {
          toneLevel: 2,
          text: '안녕하세요! 어제 행사에서 인사했던 사람이에요 ㅎㅎ 어제 얘기 재밌었어요. 혹시 괜찮으시면 다음에 커피 한잔해요!',
        },
        {
          toneLevel: 3,
          text: '안녕하세요! 어제 얘기가 너무 즐거워서 연락 안 할 수가 없었어요 ㅎㅎ 이번 주 금요일에 커피 한잔해요, 제가 괜찮은 데 알아둘게요!',
        },
      ],
    },
  ],
}

export const reviewedPromptExampleCatalog: readonly ReviewedPromptExampleSet[] = [
  ...reviewedSeedSources.groupwork,
  ...reviewedSeedSources.professor,
  ...reviewedSeedSources.senior,
  ...reviewedSeedSources.friend,
]

export const reviewedPromptExamplePairs: Readonly<Record<ScenarioId, PromptExamplePair>> = {
  groupwork: requirePromptExamplePair('groupwork', reviewedSeedSources.groupwork),
  professor: requirePromptExamplePair('professor', reviewedSeedSources.professor),
  senior: requirePromptExamplePair('senior', reviewedSeedSources.senior),
  friend: requirePromptExamplePair('friend', reviewedSeedSources.friend),
}

export const reviewedPromptExamplesFor = (scenarioId: ScenarioId): PromptExamplePair =>
  reviewedPromptExamplePairs[scenarioId]
