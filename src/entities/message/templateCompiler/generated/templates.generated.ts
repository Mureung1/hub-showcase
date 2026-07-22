import type { CompiledTemplate, TemplateManifest } from '../contracts.js'

export const generatedTemplates = [
  {
    "message": "다음 모임 시간을 맞추려고 합니다. 언제가 괜찮으십니까?",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "groupwork",
    "situationId": "schedule",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.schedule.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간을 맞추려고 합니다. 편하실 때 가능한 시간을 알려주시면 감사하겠습니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "groupwork",
    "situationId": "schedule",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.schedule.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간을 정하려고 합니다. 가능한 시간을 알려주실 수 있습니까?",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "groupwork",
    "situationId": "schedule",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.schedule.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간 맞추려고 하는데 언제가 괜찮으세요?",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "groupwork",
    "situationId": "schedule",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.schedule.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간 맞추려고 해요 편하실 때 가능한 시간 알려주세요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "groupwork",
    "situationId": "schedule",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.schedule.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간 정하려고 해요 가능한 시간 알려주실 수 있나요?",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "groupwork",
    "situationId": "schedule",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.schedule.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간을 맞추려고 한다 언제가 괜찮을까?",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "groupwork",
    "situationId": "schedule",
    "speechStyleId": "ida",
    "templateId": "groupwork.schedule.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간을 맞추려고 한다 편할 때 가능한 시간을 알려주면 좋겠다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "groupwork",
    "situationId": "schedule",
    "speechStyleId": "ida",
    "templateId": "groupwork.schedule.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간을 정하려고 한다 가능한 시간을 알려줄 수 있을까?",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "groupwork",
    "situationId": "schedule",
    "speechStyleId": "ida",
    "templateId": "groupwork.schedule.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간 맞추려고 하는데 언제가 괜찮으세용?",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "groupwork",
    "situationId": "schedule",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.schedule.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간 맞추려고 해용 편하실 때 가능한 시간 알려주세용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "groupwork",
    "situationId": "schedule",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.schedule.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간 정하려고 해용 가능한 시간 알려주실 수 있나용?",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "groupwork",
    "situationId": "schedule",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.schedule.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "내용 확인했습니다. 알려주셔서 감사합니다.",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "groupwork",
    "situationId": "thanks_check",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.thanks_check.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "챙겨 주신 덕분에 잘 확인했습니다. 정말 감사합니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "groupwork",
    "situationId": "thanks_check",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.thanks_check.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "보내 주신 내용 확인했습니다. 감사합니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "groupwork",
    "situationId": "thanks_check",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.thanks_check.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "확인했어요 알려주셔서 고마워요",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "groupwork",
    "situationId": "thanks_check",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.thanks_check.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "챙겨주신 덕분에 잘 확인했어요 고마워요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "groupwork",
    "situationId": "thanks_check",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.thanks_check.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "보내주신 내용 확인했어요 고마워요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "groupwork",
    "situationId": "thanks_check",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.thanks_check.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "내용 확인했다 알려줘서 고맙다",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "groupwork",
    "situationId": "thanks_check",
    "speechStyleId": "ida",
    "templateId": "groupwork.thanks_check.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "챙겨 준 덕분에 잘 확인했다 정말 고맙다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "groupwork",
    "situationId": "thanks_check",
    "speechStyleId": "ida",
    "templateId": "groupwork.thanks_check.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "보내 준 내용 확인했다 고맙다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "groupwork",
    "situationId": "thanks_check",
    "speechStyleId": "ida",
    "templateId": "groupwork.thanks_check.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "내용 확인했어용 알려주셔서 고마워용",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "groupwork",
    "situationId": "thanks_check",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.thanks_check.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "챙겨 주신 덕분에 잘 확인했어용 정말 고마워용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "groupwork",
    "situationId": "thanks_check",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.thanks_check.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "보내 주신 내용 확인했어용 고마워용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "groupwork",
    "situationId": "thanks_check",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.thanks_check.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 도움을 부탁드려도 되겠습니까?",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "groupwork",
    "situationId": "ask",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.ask.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮으시면 [부탁할 내용] 도움을 부탁드려도 되겠습니까?",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "groupwork",
    "situationId": "ask",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.ask.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 도움을 주실 수 있습니까?",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "groupwork",
    "situationId": "ask",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.ask.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 도움 부탁드려도 될까요?",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "groupwork",
    "situationId": "ask",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.ask.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "시간 되실 때 [부탁할 내용] 도움 부탁드려도 될까요?",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "groupwork",
    "situationId": "ask",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.ask.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 도와주실 수 있나요?",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "groupwork",
    "situationId": "ask",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.ask.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 도움을 부탁해도 될까?",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "groupwork",
    "situationId": "ask",
    "speechStyleId": "ida",
    "templateId": "groupwork.ask.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮다면 [부탁할 내용] 도움을 부탁해도 될까?",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "groupwork",
    "situationId": "ask",
    "speechStyleId": "ida",
    "templateId": "groupwork.ask.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 도와줄 수 있을까?",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "groupwork",
    "situationId": "ask",
    "speechStyleId": "ida",
    "templateId": "groupwork.ask.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 도움 부탁드려도 될까용?",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "groupwork",
    "situationId": "ask",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.ask.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮으시면 [부탁할 내용] 도움 부탁드려도 될까용?",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "groupwork",
    "situationId": "ask",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.ask.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 도와주실 수 있나용?",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "groupwork",
    "situationId": "ask",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.ask.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦어 미안합니다.",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "groupwork",
    "situationId": "apologize",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.apologize.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦었습니다. 기다리게 해서 정말 미안합니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "groupwork",
    "situationId": "apologize",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.apologize.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답이 늦었습니다. 미안합니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "groupwork",
    "situationId": "apologize",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.apologize.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦어서 미안해요",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "groupwork",
    "situationId": "apologize",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.apologize.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦었어요 기다리게 해서 정말 미안해요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "groupwork",
    "situationId": "apologize",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.apologize.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답 늦었어요 미안해요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "groupwork",
    "situationId": "apologize",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.apologize.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦어 미안하다",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "groupwork",
    "situationId": "apologize",
    "speechStyleId": "ida",
    "templateId": "groupwork.apologize.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦었다 기다리게 해서 정말 미안하다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "groupwork",
    "situationId": "apologize",
    "speechStyleId": "ida",
    "templateId": "groupwork.apologize.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답 늦었다 미안하다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "groupwork",
    "situationId": "apologize",
    "speechStyleId": "ida",
    "templateId": "groupwork.apologize.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦어서 미안해용",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "groupwork",
    "situationId": "apologize",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.apologize.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦었어용 기다리게 해서 정말 미안해용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "groupwork",
    "situationId": "apologize",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.apologize.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답 늦었어용 미안해용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "groupwork",
    "situationId": "apologize",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.apologize.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어려울 것 같습니다. 미안합니다.",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "groupwork",
    "situationId": "decline",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.decline.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "미안하지만 이번에는 어려울 것 같습니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "groupwork",
    "situationId": "decline",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.decline.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어렵습니다. 미안합니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "groupwork",
    "situationId": "decline",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.decline.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어려울 것 같아요 미안해요",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "groupwork",
    "situationId": "decline",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.decline.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "미안한데 이번에는 어려울 것 같아요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "groupwork",
    "situationId": "decline",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.decline.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어려워요 미안해요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "groupwork",
    "situationId": "decline",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.decline.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어려울 것 같다 미안하다",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "groupwork",
    "situationId": "decline",
    "speechStyleId": "ida",
    "templateId": "groupwork.decline.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "미안하지만 이번에는 어려울 것 같다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "groupwork",
    "situationId": "decline",
    "speechStyleId": "ida",
    "templateId": "groupwork.decline.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어렵다 미안하다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "groupwork",
    "situationId": "decline",
    "speechStyleId": "ida",
    "templateId": "groupwork.decline.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어려울 것 같아용 미안해용",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "groupwork",
    "situationId": "decline",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.decline.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "미안하지만 이번에는 어려울 것 같아용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "groupwork",
    "situationId": "decline",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.decline.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어려워용 미안해용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "groupwork",
    "situationId": "decline",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.decline.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "맡은 부분의 진행 상황을 공유해 주실 수 있습니까?",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "groupwork",
    "situationId": "contribution_check",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.contribution_check.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮으실 때 맡은 부분의 진행 상황을 알려주시면 감사하겠습니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "groupwork",
    "situationId": "contribution_check",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.contribution_check.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "맡은 부분이 어디까지 진행됐는지 알려주실 수 있습니까?",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "groupwork",
    "situationId": "contribution_check",
    "speechStyleId": "seumnida",
    "templateId": "groupwork.contribution_check.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "맡은 부분 진행 상황 공유해주실 수 있나요?",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "groupwork",
    "situationId": "contribution_check",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.contribution_check.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "가능하실 때 맡은 부분 진행 상황 알려주세요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "groupwork",
    "situationId": "contribution_check",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.contribution_check.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "맡은 부분 진행 상황 알려주실 수 있나요?",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "groupwork",
    "situationId": "contribution_check",
    "speechStyleId": "haeyo",
    "templateId": "groupwork.contribution_check.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "맡은 부분 진행 상황을 공유해 줄 수 있을까?",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "groupwork",
    "situationId": "contribution_check",
    "speechStyleId": "ida",
    "templateId": "groupwork.contribution_check.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮을 때 맡은 부분 진행 상황을 알려주면 좋겠다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "groupwork",
    "situationId": "contribution_check",
    "speechStyleId": "ida",
    "templateId": "groupwork.contribution_check.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "맡은 부분 진행 상황 알려줄 수 있을까?",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "groupwork",
    "situationId": "contribution_check",
    "speechStyleId": "ida",
    "templateId": "groupwork.contribution_check.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "맡은 부분 진행 상황 공유해주실 수 있나용?",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "groupwork",
    "situationId": "contribution_check",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.contribution_check.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮으실 때 맡은 부분 진행 상황 알려주세용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "groupwork",
    "situationId": "contribution_check",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.contribution_check.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "맡은 부분 진행 상황 알려주실 수 있나용?",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "groupwork",
    "situationId": "contribution_check",
    "speechStyleId": "yongyong",
    "templateId": "groupwork.contribution_check.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. 면담 가능한 시간을 알려주실 수 있습니까?",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "professor",
    "situationId": "schedule",
    "speechStyleId": "seumnida",
    "templateId": "professor.schedule.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. 괜찮으실 때 면담 가능한 시간을 알려주시면 감사하겠습니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "professor",
    "situationId": "schedule",
    "speechStyleId": "seumnida",
    "templateId": "professor.schedule.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. 면담 가능한 시간이 언제인지 여쭙습니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "professor",
    "situationId": "schedule",
    "speechStyleId": "seumnida",
    "templateId": "professor.schedule.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 면담 가능한 시간을 알려주실 수 있을까요?",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "professor",
    "situationId": "schedule",
    "speechStyleId": "haeyo",
    "templateId": "professor.schedule.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 편하실 때 면담 가능한 시간을 알려주실 수 있을까요?",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "professor",
    "situationId": "schedule",
    "speechStyleId": "haeyo",
    "templateId": "professor.schedule.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 면담 가능한 시간이 언제일까요?",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "professor",
    "situationId": "schedule",
    "speechStyleId": "haeyo",
    "templateId": "professor.schedule.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 면담 가능한 시간을 알려주실 수 있을까?",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "professor",
    "situationId": "schedule",
    "speechStyleId": "ida",
    "templateId": "professor.schedule.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 괜찮으실 때 면담 가능한 시간을 알려주시면 감사하겠다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "professor",
    "situationId": "schedule",
    "speechStyleId": "ida",
    "templateId": "professor.schedule.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 면담 가능한 시간이 언제인지 궁금하다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "professor",
    "situationId": "schedule",
    "speechStyleId": "ida",
    "templateId": "professor.schedule.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 면담 가능한 시간을 알려주실 수 있을까용?",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "professor",
    "situationId": "schedule",
    "speechStyleId": "yongyong",
    "templateId": "professor.schedule.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 편하실 때 면담 가능한 시간을 알려주시면 감사하겠어용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "professor",
    "situationId": "schedule",
    "speechStyleId": "yongyong",
    "templateId": "professor.schedule.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 면담 가능한 시간이 언제일까용?",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "professor",
    "situationId": "schedule",
    "speechStyleId": "yongyong",
    "templateId": "professor.schedule.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. 확인해 주셔서 감사합니다.",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "professor",
    "situationId": "thanks_check",
    "speechStyleId": "seumnida",
    "templateId": "professor.thanks_check.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. 살펴봐 주셔서 정말 감사합니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "professor",
    "situationId": "thanks_check",
    "speechStyleId": "seumnida",
    "templateId": "professor.thanks_check.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "확인해 주셔서 감사합니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "professor",
    "situationId": "thanks_check",
    "speechStyleId": "seumnida",
    "templateId": "professor.thanks_check.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 확인해 주셔서 감사해요",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "professor",
    "situationId": "thanks_check",
    "speechStyleId": "haeyo",
    "templateId": "professor.thanks_check.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 살펴봐 주셔서 정말 감사해요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "professor",
    "situationId": "thanks_check",
    "speechStyleId": "haeyo",
    "templateId": "professor.thanks_check.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "확인해 주신 내용 잘 봤어요 감사해요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "professor",
    "situationId": "thanks_check",
    "speechStyleId": "haeyo",
    "templateId": "professor.thanks_check.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 확인해 주셔서 감사하다",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "professor",
    "situationId": "thanks_check",
    "speechStyleId": "ida",
    "templateId": "professor.thanks_check.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 살펴봐 주셔서 정말 감사하다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "professor",
    "situationId": "thanks_check",
    "speechStyleId": "ida",
    "templateId": "professor.thanks_check.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "확인해 주신 내용 잘 보았다 감사하다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "professor",
    "situationId": "thanks_check",
    "speechStyleId": "ida",
    "templateId": "professor.thanks_check.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 확인해 주셔서 감사해용",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "professor",
    "situationId": "thanks_check",
    "speechStyleId": "yongyong",
    "templateId": "professor.thanks_check.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 살펴봐 주셔서 정말 감사해용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "professor",
    "situationId": "thanks_check",
    "speechStyleId": "yongyong",
    "templateId": "professor.thanks_check.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "확인해 주신 내용 잘 봤어용 감사해용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "professor",
    "situationId": "thanks_check",
    "speechStyleId": "yongyong",
    "templateId": "professor.thanks_check.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. [부탁할 내용] 부탁드려도 되겠습니까?",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "professor",
    "situationId": "ask",
    "speechStyleId": "seumnida",
    "templateId": "professor.ask.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. 괜찮으시다면 [부탁할 내용] 부탁드려도 되겠습니까?",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "professor",
    "situationId": "ask",
    "speechStyleId": "seumnida",
    "templateId": "professor.ask.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. [부탁할 내용] 가능하신지 여쭙습니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "professor",
    "situationId": "ask",
    "speechStyleId": "seumnida",
    "templateId": "professor.ask.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 [부탁할 내용] 부탁드려도 될까요?",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "professor",
    "situationId": "ask",
    "speechStyleId": "haeyo",
    "templateId": "professor.ask.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 괜찮으시다면 [부탁할 내용] 부탁드려도 될까요?",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "professor",
    "situationId": "ask",
    "speechStyleId": "haeyo",
    "templateId": "professor.ask.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 [부탁할 내용] 가능하실까요?",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "professor",
    "situationId": "ask",
    "speechStyleId": "haeyo",
    "templateId": "professor.ask.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 [부탁할 내용] 부탁드려도 될까?",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "professor",
    "situationId": "ask",
    "speechStyleId": "ida",
    "templateId": "professor.ask.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 괜찮으시다면 [부탁할 내용] 부탁드려도 될까?",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "professor",
    "situationId": "ask",
    "speechStyleId": "ida",
    "templateId": "professor.ask.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 [부탁할 내용] 가능하신지 궁금하다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "professor",
    "situationId": "ask",
    "speechStyleId": "ida",
    "templateId": "professor.ask.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 [부탁할 내용] 부탁드려도 될까용?",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "professor",
    "situationId": "ask",
    "speechStyleId": "yongyong",
    "templateId": "professor.ask.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 괜찮으시다면 [부탁할 내용] 부탁드려도 될까용?",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "professor",
    "situationId": "ask",
    "speechStyleId": "yongyong",
    "templateId": "professor.ask.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 [부탁할 내용] 가능하실까용?",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "professor",
    "situationId": "ask",
    "speechStyleId": "yongyong",
    "templateId": "professor.ask.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. 답장이 늦어 죄송합니다.",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "professor",
    "situationId": "apologize",
    "speechStyleId": "seumnida",
    "templateId": "professor.apologize.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. 답장이 늦었습니다. 기다리게 해 드려 정말 죄송합니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "professor",
    "situationId": "apologize",
    "speechStyleId": "seumnida",
    "templateId": "professor.apologize.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦었습니다. 죄송합니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "professor",
    "situationId": "apologize",
    "speechStyleId": "seumnida",
    "templateId": "professor.apologize.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 답장이 늦어 죄송해요",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "professor",
    "situationId": "apologize",
    "speechStyleId": "haeyo",
    "templateId": "professor.apologize.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 답장이 늦었어요 기다리게 해 드려 정말 죄송해요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "professor",
    "situationId": "apologize",
    "speechStyleId": "haeyo",
    "templateId": "professor.apologize.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦었어요 죄송해요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "professor",
    "situationId": "apologize",
    "speechStyleId": "haeyo",
    "templateId": "professor.apologize.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 답장이 늦어 죄송하다",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "professor",
    "situationId": "apologize",
    "speechStyleId": "ida",
    "templateId": "professor.apologize.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 답장이 늦었다 기다리게 해 드려 정말 죄송하다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "professor",
    "situationId": "apologize",
    "speechStyleId": "ida",
    "templateId": "professor.apologize.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦었다 죄송하다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "professor",
    "situationId": "apologize",
    "speechStyleId": "ida",
    "templateId": "professor.apologize.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 답장이 늦어 죄송해용",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "professor",
    "situationId": "apologize",
    "speechStyleId": "yongyong",
    "templateId": "professor.apologize.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 답장이 늦었어용 기다리게 해 드려 정말 죄송해용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "professor",
    "situationId": "apologize",
    "speechStyleId": "yongyong",
    "templateId": "professor.apologize.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦었어용 죄송해용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "professor",
    "situationId": "apologize",
    "speechStyleId": "yongyong",
    "templateId": "professor.apologize.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. 이번에는 어려울 것 같습니다. 죄송합니다.",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "professor",
    "situationId": "decline",
    "speechStyleId": "seumnida",
    "templateId": "professor.decline.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. 죄송하지만 이번에는 어려울 것 같습니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "professor",
    "situationId": "decline",
    "speechStyleId": "seumnida",
    "templateId": "professor.decline.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. 이번에는 어렵습니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "professor",
    "situationId": "decline",
    "speechStyleId": "seumnida",
    "templateId": "professor.decline.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 이번에는 어려울 것 같아요 죄송해요",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "professor",
    "situationId": "decline",
    "speechStyleId": "haeyo",
    "templateId": "professor.decline.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 죄송하지만 이번에는 어려울 것 같아요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "professor",
    "situationId": "decline",
    "speechStyleId": "haeyo",
    "templateId": "professor.decline.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 이번에는 어려워요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "professor",
    "situationId": "decline",
    "speechStyleId": "haeyo",
    "templateId": "professor.decline.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 이번에는 어려울 것 같다 죄송하다",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "professor",
    "situationId": "decline",
    "speechStyleId": "ida",
    "templateId": "professor.decline.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 죄송하지만 이번에는 어려울 것 같다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "professor",
    "situationId": "decline",
    "speechStyleId": "ida",
    "templateId": "professor.decline.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 이번에는 어렵다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "professor",
    "situationId": "decline",
    "speechStyleId": "ida",
    "templateId": "professor.decline.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 이번에는 어려울 것 같아용 죄송해용",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "professor",
    "situationId": "decline",
    "speechStyleId": "yongyong",
    "templateId": "professor.decline.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 죄송하지만 이번에는 어려울 것 같아용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "professor",
    "situationId": "decline",
    "speechStyleId": "yongyong",
    "templateId": "professor.decline.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 이번에는 어려워용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "professor",
    "situationId": "decline",
    "speechStyleId": "yongyong",
    "templateId": "professor.decline.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. 결석하게 되어 과제 제출 방법을 여쭤봐도 되겠습니까?",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "professor",
    "situationId": "absence_inquiry",
    "speechStyleId": "seumnida",
    "templateId": "professor.absence_inquiry.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. 결석하게 되어 괜찮으실 때 과제 제출 방법을 알려주시면 감사하겠습니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "professor",
    "situationId": "absence_inquiry",
    "speechStyleId": "seumnida",
    "templateId": "professor.absence_inquiry.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요. 결석하게 되었습니다. 과제 제출 방법을 알려주실 수 있습니까?",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "professor",
    "situationId": "absence_inquiry",
    "speechStyleId": "seumnida",
    "templateId": "professor.absence_inquiry.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 결석하게 돼서 과제 제출 방법을 여쭤봐도 될까요?",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "professor",
    "situationId": "absence_inquiry",
    "speechStyleId": "haeyo",
    "templateId": "professor.absence_inquiry.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 결석하게 됐어요 괜찮으실 때 과제 제출 방법을 알려주실 수 있을까요?",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "professor",
    "situationId": "absence_inquiry",
    "speechStyleId": "haeyo",
    "templateId": "professor.absence_inquiry.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세요 결석하게 됐어요 과제 제출 방법이 어떻게 될까요?",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "professor",
    "situationId": "absence_inquiry",
    "speechStyleId": "haeyo",
    "templateId": "professor.absence_inquiry.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 결석하게 되어 과제 제출 방법을 여쭤봐도 될까?",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "professor",
    "situationId": "absence_inquiry",
    "speechStyleId": "ida",
    "templateId": "professor.absence_inquiry.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 결석하게 되었다 괜찮으실 때 과제 제출 방법을 알려주시면 감사하겠다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "professor",
    "situationId": "absence_inquiry",
    "speechStyleId": "ida",
    "templateId": "professor.absence_inquiry.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하십니까 결석하게 되었다 과제 제출 방법이 궁금하다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "professor",
    "situationId": "absence_inquiry",
    "speechStyleId": "ida",
    "templateId": "professor.absence_inquiry.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 결석하게 돼서 과제 제출 방법을 여쭤봐도 될까용?",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "professor",
    "situationId": "absence_inquiry",
    "speechStyleId": "yongyong",
    "templateId": "professor.absence_inquiry.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 결석하게 됐어용 괜찮으실 때 과제 제출 방법을 알려주실 수 있을까용?",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "professor",
    "situationId": "absence_inquiry",
    "speechStyleId": "yongyong",
    "templateId": "professor.absence_inquiry.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "안녕하세용 결석하게 됐어용 과제 제출 방법이 어떻게 될까용?",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "professor",
    "situationId": "absence_inquiry",
    "speechStyleId": "yongyong",
    "templateId": "professor.absence_inquiry.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간이 언제인지 알려주실 수 있습니까?",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "senior",
    "situationId": "schedule",
    "speechStyleId": "seumnida",
    "templateId": "senior.schedule.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "편하실 때 다음 모임 시간을 알려주시면 감사하겠습니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "senior",
    "situationId": "schedule",
    "speechStyleId": "seumnida",
    "templateId": "senior.schedule.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간을 알려주실 수 있습니까?",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "senior",
    "situationId": "schedule",
    "speechStyleId": "seumnida",
    "templateId": "senior.schedule.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간이 언제인지 알려주실 수 있나요?",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "senior",
    "situationId": "schedule",
    "speechStyleId": "haeyo",
    "templateId": "senior.schedule.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "편하실 때 다음 모임 시간 알려주세요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "senior",
    "situationId": "schedule",
    "speechStyleId": "haeyo",
    "templateId": "senior.schedule.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간 알려주실 수 있나요?",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "senior",
    "situationId": "schedule",
    "speechStyleId": "haeyo",
    "templateId": "senior.schedule.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간이 언제인지 알려줄 수 있을까?",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "senior",
    "situationId": "schedule",
    "speechStyleId": "ida",
    "templateId": "senior.schedule.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "편할 때 다음 모임 시간을 알려주면 고맙겠다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "senior",
    "situationId": "schedule",
    "speechStyleId": "ida",
    "templateId": "senior.schedule.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간을 알려줄 수 있을까?",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "senior",
    "situationId": "schedule",
    "speechStyleId": "ida",
    "templateId": "senior.schedule.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간이 언제인지 알려주실 수 있나용?",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "senior",
    "situationId": "schedule",
    "speechStyleId": "yongyong",
    "templateId": "senior.schedule.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "편하실 때 다음 모임 시간 알려주세용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "senior",
    "situationId": "schedule",
    "speechStyleId": "yongyong",
    "templateId": "senior.schedule.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "다음 모임 시간 알려주실 수 있나용?",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "senior",
    "situationId": "schedule",
    "speechStyleId": "yongyong",
    "templateId": "senior.schedule.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "확인했습니다. 알려주셔서 고맙습니다.",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "senior",
    "situationId": "thanks_check",
    "speechStyleId": "seumnida",
    "templateId": "senior.thanks_check.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "덕분에 잘 확인했습니다. 정말 고맙습니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "senior",
    "situationId": "thanks_check",
    "speechStyleId": "seumnida",
    "templateId": "senior.thanks_check.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "내용 확인했습니다. 고맙습니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "senior",
    "situationId": "thanks_check",
    "speechStyleId": "seumnida",
    "templateId": "senior.thanks_check.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "확인했어요 알려주셔서 감사해요",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "senior",
    "situationId": "thanks_check",
    "speechStyleId": "haeyo",
    "templateId": "senior.thanks_check.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "덕분에 잘 확인했어요 정말 감사해요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "senior",
    "situationId": "thanks_check",
    "speechStyleId": "haeyo",
    "templateId": "senior.thanks_check.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "내용 확인했어요 감사해요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "senior",
    "situationId": "thanks_check",
    "speechStyleId": "haeyo",
    "templateId": "senior.thanks_check.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "확인했다 알려줘서 감사하다",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "senior",
    "situationId": "thanks_check",
    "speechStyleId": "ida",
    "templateId": "senior.thanks_check.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "덕분에 잘 확인했다 정말 감사하다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "senior",
    "situationId": "thanks_check",
    "speechStyleId": "ida",
    "templateId": "senior.thanks_check.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "내용 확인했다 감사하다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "senior",
    "situationId": "thanks_check",
    "speechStyleId": "ida",
    "templateId": "senior.thanks_check.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "확인했어용 알려주셔서 감사해용",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "senior",
    "situationId": "thanks_check",
    "speechStyleId": "yongyong",
    "templateId": "senior.thanks_check.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "덕분에 잘 확인했어용 정말 감사해용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "senior",
    "situationId": "thanks_check",
    "speechStyleId": "yongyong",
    "templateId": "senior.thanks_check.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "내용 확인했어용 감사해용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "senior",
    "situationId": "thanks_check",
    "speechStyleId": "yongyong",
    "templateId": "senior.thanks_check.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 부탁드려도 되겠습니까?",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "senior",
    "situationId": "ask",
    "speechStyleId": "seumnida",
    "templateId": "senior.ask.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮으시면 [부탁할 내용] 부탁드려도 되겠습니까?",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "senior",
    "situationId": "ask",
    "speechStyleId": "seumnida",
    "templateId": "senior.ask.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 가능하신지 알려주실 수 있습니까?",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "senior",
    "situationId": "ask",
    "speechStyleId": "seumnida",
    "templateId": "senior.ask.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 부탁드려도 될까요?",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "senior",
    "situationId": "ask",
    "speechStyleId": "haeyo",
    "templateId": "senior.ask.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "바쁘지 않으시면 [부탁할 내용] 부탁드려도 될까요?",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "senior",
    "situationId": "ask",
    "speechStyleId": "haeyo",
    "templateId": "senior.ask.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 가능하실까요?",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "senior",
    "situationId": "ask",
    "speechStyleId": "haeyo",
    "templateId": "senior.ask.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 부탁해도 될까?",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "senior",
    "situationId": "ask",
    "speechStyleId": "ida",
    "templateId": "senior.ask.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮다면 [부탁할 내용] 부탁해도 될까?",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "senior",
    "situationId": "ask",
    "speechStyleId": "ida",
    "templateId": "senior.ask.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 가능할까?",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "senior",
    "situationId": "ask",
    "speechStyleId": "ida",
    "templateId": "senior.ask.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 부탁드려도 될까용?",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "senior",
    "situationId": "ask",
    "speechStyleId": "yongyong",
    "templateId": "senior.ask.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮으시면 [부탁할 내용] 부탁드려도 될까용?",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "senior",
    "situationId": "ask",
    "speechStyleId": "yongyong",
    "templateId": "senior.ask.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 가능하실까용?",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "senior",
    "situationId": "ask",
    "speechStyleId": "yongyong",
    "templateId": "senior.ask.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦어 죄송합니다.",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "senior",
    "situationId": "apologize",
    "speechStyleId": "seumnida",
    "templateId": "senior.apologize.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦었습니다. 기다리게 해서 정말 죄송합니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "senior",
    "situationId": "apologize",
    "speechStyleId": "seumnida",
    "templateId": "senior.apologize.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답이 늦었습니다. 죄송합니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "senior",
    "situationId": "apologize",
    "speechStyleId": "seumnida",
    "templateId": "senior.apologize.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦어서 죄송해요",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "senior",
    "situationId": "apologize",
    "speechStyleId": "haeyo",
    "templateId": "senior.apologize.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦었어요 기다리게 해서 정말 죄송해요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "senior",
    "situationId": "apologize",
    "speechStyleId": "haeyo",
    "templateId": "senior.apologize.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답 늦었어요 죄송해요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "senior",
    "situationId": "apologize",
    "speechStyleId": "haeyo",
    "templateId": "senior.apologize.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦어 죄송하다",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "senior",
    "situationId": "apologize",
    "speechStyleId": "ida",
    "templateId": "senior.apologize.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦었다 기다리게 해서 정말 죄송하다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "senior",
    "situationId": "apologize",
    "speechStyleId": "ida",
    "templateId": "senior.apologize.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답 늦었다 죄송하다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "senior",
    "situationId": "apologize",
    "speechStyleId": "ida",
    "templateId": "senior.apologize.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦어서 죄송해용",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "senior",
    "situationId": "apologize",
    "speechStyleId": "yongyong",
    "templateId": "senior.apologize.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답장이 늦었어용 기다리게 해서 정말 죄송해용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "senior",
    "situationId": "apologize",
    "speechStyleId": "yongyong",
    "templateId": "senior.apologize.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답 늦었어용 죄송해용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "senior",
    "situationId": "apologize",
    "speechStyleId": "yongyong",
    "templateId": "senior.apologize.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어려울 것 같습니다. 죄송합니다.",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "senior",
    "situationId": "decline",
    "speechStyleId": "seumnida",
    "templateId": "senior.decline.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "죄송하지만 이번에는 어려울 것 같습니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "senior",
    "situationId": "decline",
    "speechStyleId": "seumnida",
    "templateId": "senior.decline.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어렵습니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "senior",
    "situationId": "decline",
    "speechStyleId": "seumnida",
    "templateId": "senior.decline.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어려울 것 같아요 죄송해요",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "senior",
    "situationId": "decline",
    "speechStyleId": "haeyo",
    "templateId": "senior.decline.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "죄송하지만 이번에는 어려울 것 같아요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "senior",
    "situationId": "decline",
    "speechStyleId": "haeyo",
    "templateId": "senior.decline.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어려워요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "senior",
    "situationId": "decline",
    "speechStyleId": "haeyo",
    "templateId": "senior.decline.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어려울 것 같다 죄송하다",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "senior",
    "situationId": "decline",
    "speechStyleId": "ida",
    "templateId": "senior.decline.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "죄송하지만 이번에는 어려울 것 같다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "senior",
    "situationId": "decline",
    "speechStyleId": "ida",
    "templateId": "senior.decline.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어렵다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "senior",
    "situationId": "decline",
    "speechStyleId": "ida",
    "templateId": "senior.decline.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어려울 것 같아용 죄송해용",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "senior",
    "situationId": "decline",
    "speechStyleId": "yongyong",
    "templateId": "senior.decline.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "죄송하지만 이번에는 어려울 것 같아용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "senior",
    "situationId": "decline",
    "speechStyleId": "yongyong",
    "templateId": "senior.decline.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "이번에는 어려워용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "senior",
    "situationId": "decline",
    "speechStyleId": "yongyong",
    "templateId": "senior.decline.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "저에게는 편하게 말씀하셔도 되고 존댓말을 쓰셔도 괜찮습니다.",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "senior",
    "situationId": "casual_request",
    "speechStyleId": "seumnida",
    "templateId": "senior.casual_request.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "혹시 편하시면 저에게는 말을 편하게 하셔도 괜찮습니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "senior",
    "situationId": "casual_request",
    "speechStyleId": "seumnida",
    "templateId": "senior.casual_request.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "저에게는 편하게 말씀하셔도 괜찮습니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "senior",
    "situationId": "casual_request",
    "speechStyleId": "seumnida",
    "templateId": "senior.casual_request.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "저한테는 말 편하게 하셔도 되고 존댓말로 하셔도 괜찮아요",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "senior",
    "situationId": "casual_request",
    "speechStyleId": "haeyo",
    "templateId": "senior.casual_request.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "혹시 편하시면 저한테는 말 편하게 하셔도 괜찮아요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "senior",
    "situationId": "casual_request",
    "speechStyleId": "haeyo",
    "templateId": "senior.casual_request.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "저한테는 편하게 말씀하셔도 괜찮아요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "senior",
    "situationId": "casual_request",
    "speechStyleId": "haeyo",
    "templateId": "senior.casual_request.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "나한테는 편하게 말해도 되고 존댓말을 써도 괜찮다",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "senior",
    "situationId": "casual_request",
    "speechStyleId": "ida",
    "templateId": "senior.casual_request.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "혹시 편하다면 나한테는 말을 편하게 해도 괜찮다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "senior",
    "situationId": "casual_request",
    "speechStyleId": "ida",
    "templateId": "senior.casual_request.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "나한테는 편하게 말해도 괜찮다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "senior",
    "situationId": "casual_request",
    "speechStyleId": "ida",
    "templateId": "senior.casual_request.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "저한테는 말 편하게 하셔도 되고 존댓말로 하셔도 괜찮아용",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "senior",
    "situationId": "casual_request",
    "speechStyleId": "yongyong",
    "templateId": "senior.casual_request.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "혹시 편하시면 저한테는 말 편하게 하셔도 괜찮아용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "senior",
    "situationId": "casual_request",
    "speechStyleId": "yongyong",
    "templateId": "senior.casual_request.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "저한테는 편하게 말씀하셔도 괜찮아용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "senior",
    "situationId": "casual_request",
    "speechStyleId": "yongyong",
    "templateId": "senior.casual_request.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "우리 만날 시간을 정하고 싶습니다. 언제가 괜찮습니까?",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "friend",
    "situationId": "schedule",
    "speechStyleId": "seumnida",
    "templateId": "friend.schedule.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮으실 때 우리 만날 시간을 정하면 좋겠습니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "friend",
    "situationId": "schedule",
    "speechStyleId": "seumnida",
    "templateId": "friend.schedule.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "우리 만날 시간은 언제가 괜찮습니까?",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "friend",
    "situationId": "schedule",
    "speechStyleId": "seumnida",
    "templateId": "friend.schedule.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "우리 언제 볼지 정해볼까요?",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "friend",
    "situationId": "schedule",
    "speechStyleId": "haeyo",
    "templateId": "friend.schedule.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮으면 우리 만날 시간 정해볼까요?",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "friend",
    "situationId": "schedule",
    "speechStyleId": "haeyo",
    "templateId": "friend.schedule.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "우리 만날 시간 정해요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "friend",
    "situationId": "schedule",
    "speechStyleId": "haeyo",
    "templateId": "friend.schedule.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "우리 언제 볼지 정해볼까?",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "friend",
    "situationId": "schedule",
    "speechStyleId": "ida",
    "templateId": "friend.schedule.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮으면 우리 만날 시간 정할까?",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "friend",
    "situationId": "schedule",
    "speechStyleId": "ida",
    "templateId": "friend.schedule.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "우리 만날 시간 정할까?",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "friend",
    "situationId": "schedule",
    "speechStyleId": "ida",
    "templateId": "friend.schedule.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "우리 언제 볼지 정해볼까용?",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "friend",
    "situationId": "schedule",
    "speechStyleId": "yongyong",
    "templateId": "friend.schedule.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮으면 우리 만날 시간 정해볼까용?",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "friend",
    "situationId": "schedule",
    "speechStyleId": "yongyong",
    "templateId": "friend.schedule.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "우리 만날 시간 정해용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "friend",
    "situationId": "schedule",
    "speechStyleId": "yongyong",
    "templateId": "friend.schedule.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "확인했습니다. 알려줘서 고맙습니다.",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "friend",
    "situationId": "thanks_check",
    "speechStyleId": "seumnida",
    "templateId": "friend.thanks_check.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "챙겨줘서 잘 확인했습니다. 정말 고맙습니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "friend",
    "situationId": "thanks_check",
    "speechStyleId": "seumnida",
    "templateId": "friend.thanks_check.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "보내 준 내용 확인했습니다. 고맙습니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "friend",
    "situationId": "thanks_check",
    "speechStyleId": "seumnida",
    "templateId": "friend.thanks_check.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "확인했어요 알려줘서 고마워요",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "friend",
    "situationId": "thanks_check",
    "speechStyleId": "haeyo",
    "templateId": "friend.thanks_check.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "덕분에 잘 확인했어요 정말 고마워요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "friend",
    "situationId": "thanks_check",
    "speechStyleId": "haeyo",
    "templateId": "friend.thanks_check.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "보내준 내용 확인했어요 고마워요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "friend",
    "situationId": "thanks_check",
    "speechStyleId": "haeyo",
    "templateId": "friend.thanks_check.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "확인했다 알려줘서 고맙다",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "friend",
    "situationId": "thanks_check",
    "speechStyleId": "ida",
    "templateId": "friend.thanks_check.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "덕분에 잘 확인했다 정말 고맙다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "friend",
    "situationId": "thanks_check",
    "speechStyleId": "ida",
    "templateId": "friend.thanks_check.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "보내준 내용 확인했다 고맙다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "friend",
    "situationId": "thanks_check",
    "speechStyleId": "ida",
    "templateId": "friend.thanks_check.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "확인했어용 알려줘서 고마워용",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "friend",
    "situationId": "thanks_check",
    "speechStyleId": "yongyong",
    "templateId": "friend.thanks_check.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "덕분에 잘 확인했어용 정말 고마워용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "friend",
    "situationId": "thanks_check",
    "speechStyleId": "yongyong",
    "templateId": "friend.thanks_check.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "보내준 내용 확인했어용 고마워용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "friend",
    "situationId": "thanks_check",
    "speechStyleId": "yongyong",
    "templateId": "friend.thanks_check.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 해줄 수 있습니까?",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "friend",
    "situationId": "ask",
    "speechStyleId": "seumnida",
    "templateId": "friend.ask.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮다면 [부탁할 내용] 해줄 수 있겠습니까?",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "friend",
    "situationId": "ask",
    "speechStyleId": "seumnida",
    "templateId": "friend.ask.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 해주겠습니까?",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "friend",
    "situationId": "ask",
    "speechStyleId": "seumnida",
    "templateId": "friend.ask.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 해줄 수 있어요?",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "friend",
    "situationId": "ask",
    "speechStyleId": "haeyo",
    "templateId": "friend.ask.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮으면 [부탁할 내용] 해줄 수 있을까요?",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "friend",
    "situationId": "ask",
    "speechStyleId": "haeyo",
    "templateId": "friend.ask.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 해줄래요?",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "friend",
    "situationId": "ask",
    "speechStyleId": "haeyo",
    "templateId": "friend.ask.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 해줄 수 있어?",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "friend",
    "situationId": "ask",
    "speechStyleId": "ida",
    "templateId": "friend.ask.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮으면 [부탁할 내용] 해줄 수 있을까?",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "friend",
    "situationId": "ask",
    "speechStyleId": "ida",
    "templateId": "friend.ask.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 해줄래?",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "friend",
    "situationId": "ask",
    "speechStyleId": "ida",
    "templateId": "friend.ask.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 해줄 수 있어용?",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "friend",
    "situationId": "ask",
    "speechStyleId": "yongyong",
    "templateId": "friend.ask.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "괜찮으면 [부탁할 내용] 해줄 수 있을까용?",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "friend",
    "situationId": "ask",
    "speechStyleId": "yongyong",
    "templateId": "friend.ask.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "[부탁할 내용] 해줄래용?",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "friend",
    "situationId": "ask",
    "speechStyleId": "yongyong",
    "templateId": "friend.ask.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답이 늦어서 미안합니다.",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "friend",
    "situationId": "apologize",
    "speechStyleId": "seumnida",
    "templateId": "friend.apologize.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답이 늦었습니다. 기다리게 해서 정말 미안합니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "friend",
    "situationId": "apologize",
    "speechStyleId": "seumnida",
    "templateId": "friend.apologize.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "늦게 답했습니다. 미안합니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "friend",
    "situationId": "apologize",
    "speechStyleId": "seumnida",
    "templateId": "friend.apologize.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답이 늦어서 미안해요",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "friend",
    "situationId": "apologize",
    "speechStyleId": "haeyo",
    "templateId": "friend.apologize.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답이 늦었어요 기다리게 해서 정말 미안해요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "friend",
    "situationId": "apologize",
    "speechStyleId": "haeyo",
    "templateId": "friend.apologize.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "늦게 답했어요 미안해요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "friend",
    "situationId": "apologize",
    "speechStyleId": "haeyo",
    "templateId": "friend.apologize.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답이 늦어서 미안하다",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "friend",
    "situationId": "apologize",
    "speechStyleId": "ida",
    "templateId": "friend.apologize.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답이 늦었다 기다리게 해서 정말 미안하다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "friend",
    "situationId": "apologize",
    "speechStyleId": "ida",
    "templateId": "friend.apologize.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "늦게 답했다 미안하다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "friend",
    "situationId": "apologize",
    "speechStyleId": "ida",
    "templateId": "friend.apologize.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답이 늦어서 미안해용",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "friend",
    "situationId": "apologize",
    "speechStyleId": "yongyong",
    "templateId": "friend.apologize.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "답이 늦었어용 기다리게 해서 정말 미안해용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "friend",
    "situationId": "apologize",
    "speechStyleId": "yongyong",
    "templateId": "friend.apologize.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "늦게 답했어용 미안해용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "friend",
    "situationId": "apologize",
    "speechStyleId": "yongyong",
    "templateId": "friend.apologize.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "미안합니다. 이번에는 어려울 것 같습니다.",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "friend",
    "situationId": "decline",
    "speechStyleId": "seumnida",
    "templateId": "friend.decline.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "정말 미안하지만 이번에는 어려울 것 같습니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "friend",
    "situationId": "decline",
    "speechStyleId": "seumnida",
    "templateId": "friend.decline.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "미안합니다. 이번에는 어렵습니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "friend",
    "situationId": "decline",
    "speechStyleId": "seumnida",
    "templateId": "friend.decline.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "미안해요 이번에는 어려울 것 같아요",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "friend",
    "situationId": "decline",
    "speechStyleId": "haeyo",
    "templateId": "friend.decline.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "정말 미안한데 이번에는 어려울 것 같아요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "friend",
    "situationId": "decline",
    "speechStyleId": "haeyo",
    "templateId": "friend.decline.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "미안해요 이번에는 어려워요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "friend",
    "situationId": "decline",
    "speechStyleId": "haeyo",
    "templateId": "friend.decline.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "미안하다 이번에는 어려울 것 같다",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "friend",
    "situationId": "decline",
    "speechStyleId": "ida",
    "templateId": "friend.decline.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "정말 미안하지만 이번에는 어려울 것 같다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "friend",
    "situationId": "decline",
    "speechStyleId": "ida",
    "templateId": "friend.decline.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "미안하다 이번에는 어렵다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "friend",
    "situationId": "decline",
    "speechStyleId": "ida",
    "templateId": "friend.decline.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "미안해용 이번에는 어려울 것 같아용",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "friend",
    "situationId": "decline",
    "speechStyleId": "yongyong",
    "templateId": "friend.decline.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "정말 미안하지만 이번에는 어려울 것 같아용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "friend",
    "situationId": "decline",
    "speechStyleId": "yongyong",
    "templateId": "friend.decline.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "미안해용 이번에는 어려워용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "friend",
    "situationId": "decline",
    "speechStyleId": "yongyong",
    "templateId": "friend.decline.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "함께 있으면 편하고 좋습니다.",
    "ruleId": "speech.seumnida.tone.1",
    "scenarioId": "friend",
    "situationId": "express_feelings",
    "speechStyleId": "seumnida",
    "templateId": "friend.express_feelings.seumnida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "함께 있으면 마음이 편하고 정말 좋습니다.",
    "ruleId": "speech.seumnida.tone.2",
    "scenarioId": "friend",
    "situationId": "express_feelings",
    "speechStyleId": "seumnida",
    "templateId": "friend.express_feelings.seumnida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "함께 있는 것이 좋습니다.",
    "ruleId": "speech.seumnida.tone.3",
    "scenarioId": "friend",
    "situationId": "express_feelings",
    "speechStyleId": "seumnida",
    "templateId": "friend.express_feelings.seumnida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "같이 있으면 편하고 좋아요",
    "ruleId": "speech.haeyo.tone.1",
    "scenarioId": "friend",
    "situationId": "express_feelings",
    "speechStyleId": "haeyo",
    "templateId": "friend.express_feelings.haeyo.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "같이 있으면 마음이 편하고 정말 좋아요",
    "ruleId": "speech.haeyo.tone.2",
    "scenarioId": "friend",
    "situationId": "express_feelings",
    "speechStyleId": "haeyo",
    "templateId": "friend.express_feelings.haeyo.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "같이 있는 게 좋아요",
    "ruleId": "speech.haeyo.tone.3",
    "scenarioId": "friend",
    "situationId": "express_feelings",
    "speechStyleId": "haeyo",
    "templateId": "friend.express_feelings.haeyo.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "같이 있으면 편하고 좋다",
    "ruleId": "speech.ida.tone.1",
    "scenarioId": "friend",
    "situationId": "express_feelings",
    "speechStyleId": "ida",
    "templateId": "friend.express_feelings.ida.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "같이 있으면 마음이 편하고 정말 좋다",
    "ruleId": "speech.ida.tone.2",
    "scenarioId": "friend",
    "situationId": "express_feelings",
    "speechStyleId": "ida",
    "templateId": "friend.express_feelings.ida.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "같이 있는 게 좋다",
    "ruleId": "speech.ida.tone.3",
    "scenarioId": "friend",
    "situationId": "express_feelings",
    "speechStyleId": "ida",
    "templateId": "friend.express_feelings.ida.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "같이 있으면 편하고 좋아용",
    "ruleId": "speech.yongyong.tone.1",
    "scenarioId": "friend",
    "situationId": "express_feelings",
    "speechStyleId": "yongyong",
    "templateId": "friend.express_feelings.yongyong.1",
    "toneLevel": 1,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "같이 있으면 마음이 편하고 정말 좋아용",
    "ruleId": "speech.yongyong.tone.2",
    "scenarioId": "friend",
    "situationId": "express_feelings",
    "speechStyleId": "yongyong",
    "templateId": "friend.express_feelings.yongyong.2",
    "toneLevel": 2,
    "version": "t25-approved-2026-07-21.1"
  },
  {
    "message": "같이 있는 게 좋아용",
    "ruleId": "speech.yongyong.tone.3",
    "scenarioId": "friend",
    "situationId": "express_feelings",
    "speechStyleId": "yongyong",
    "templateId": "friend.express_feelings.yongyong.3",
    "toneLevel": 3,
    "version": "t25-approved-2026-07-21.1"
  }
] as const satisfies readonly CompiledTemplate[]

export const generatedTemplateManifest = {
  "checksum": "4ac4ea33750c42164fac4b14d6b43071de122fccf3c5136868beb7ba6261c69f",
  "entries": [
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "groupwork.schedule.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "groupwork.schedule.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "groupwork.schedule.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "groupwork.schedule.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "groupwork.schedule.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "groupwork.schedule.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "groupwork.schedule.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "groupwork.schedule.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "groupwork.schedule.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "groupwork.schedule.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "groupwork.schedule.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "groupwork.schedule.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "groupwork.thanks_check.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "groupwork.thanks_check.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "groupwork.thanks_check.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "groupwork.thanks_check.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "groupwork.thanks_check.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "groupwork.thanks_check.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "groupwork.thanks_check.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "groupwork.thanks_check.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "groupwork.thanks_check.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "groupwork.thanks_check.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "groupwork.thanks_check.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "groupwork.thanks_check.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "groupwork.ask.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "groupwork.ask.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "groupwork.ask.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "groupwork.ask.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "groupwork.ask.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "groupwork.ask.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "groupwork.ask.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "groupwork.ask.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "groupwork.ask.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "groupwork.ask.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "groupwork.ask.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "groupwork.ask.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "groupwork.apologize.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "groupwork.apologize.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "groupwork.apologize.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "groupwork.apologize.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "groupwork.apologize.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "groupwork.apologize.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "groupwork.apologize.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "groupwork.apologize.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "groupwork.apologize.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "groupwork.apologize.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "groupwork.apologize.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "groupwork.apologize.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "groupwork.decline.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "groupwork.decline.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "groupwork.decline.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "groupwork.decline.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "groupwork.decline.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "groupwork.decline.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "groupwork.decline.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "groupwork.decline.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "groupwork.decline.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "groupwork.decline.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "groupwork.decline.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "groupwork.decline.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "groupwork.contribution_check.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "groupwork.contribution_check.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "groupwork.contribution_check.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "groupwork.contribution_check.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "groupwork.contribution_check.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "groupwork.contribution_check.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "groupwork.contribution_check.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "groupwork.contribution_check.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "groupwork.contribution_check.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "groupwork.contribution_check.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "groupwork.contribution_check.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "groupwork.contribution_check.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "professor.schedule.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "professor.schedule.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "professor.schedule.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "professor.schedule.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "professor.schedule.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "professor.schedule.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "professor.schedule.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "professor.schedule.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "professor.schedule.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "professor.schedule.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "professor.schedule.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "professor.schedule.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "professor.thanks_check.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "professor.thanks_check.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "professor.thanks_check.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "professor.thanks_check.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "professor.thanks_check.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "professor.thanks_check.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "professor.thanks_check.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "professor.thanks_check.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "professor.thanks_check.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "professor.thanks_check.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "professor.thanks_check.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "professor.thanks_check.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "professor.ask.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "professor.ask.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "professor.ask.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "professor.ask.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "professor.ask.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "professor.ask.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "professor.ask.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "professor.ask.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "professor.ask.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "professor.ask.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "professor.ask.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "professor.ask.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "professor.apologize.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "professor.apologize.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "professor.apologize.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "professor.apologize.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "professor.apologize.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "professor.apologize.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "professor.apologize.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "professor.apologize.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "professor.apologize.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "professor.apologize.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "professor.apologize.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "professor.apologize.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "professor.decline.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "professor.decline.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "professor.decline.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "professor.decline.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "professor.decline.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "professor.decline.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "professor.decline.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "professor.decline.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "professor.decline.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "professor.decline.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "professor.decline.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "professor.decline.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "professor.absence_inquiry.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "professor.absence_inquiry.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "professor.absence_inquiry.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "professor.absence_inquiry.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "professor.absence_inquiry.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "professor.absence_inquiry.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "professor.absence_inquiry.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "professor.absence_inquiry.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "professor.absence_inquiry.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "professor.absence_inquiry.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "professor.absence_inquiry.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "professor.absence_inquiry.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "senior.schedule.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "senior.schedule.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "senior.schedule.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "senior.schedule.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "senior.schedule.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "senior.schedule.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "senior.schedule.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "senior.schedule.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "senior.schedule.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "senior.schedule.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "senior.schedule.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "senior.schedule.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "senior.thanks_check.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "senior.thanks_check.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "senior.thanks_check.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "senior.thanks_check.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "senior.thanks_check.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "senior.thanks_check.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "senior.thanks_check.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "senior.thanks_check.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "senior.thanks_check.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "senior.thanks_check.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "senior.thanks_check.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "senior.thanks_check.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "senior.ask.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "senior.ask.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "senior.ask.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "senior.ask.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "senior.ask.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "senior.ask.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "senior.ask.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "senior.ask.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "senior.ask.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "senior.ask.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "senior.ask.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "senior.ask.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "senior.apologize.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "senior.apologize.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "senior.apologize.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "senior.apologize.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "senior.apologize.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "senior.apologize.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "senior.apologize.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "senior.apologize.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "senior.apologize.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "senior.apologize.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "senior.apologize.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "senior.apologize.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "senior.decline.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "senior.decline.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "senior.decline.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "senior.decline.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "senior.decline.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "senior.decline.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "senior.decline.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "senior.decline.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "senior.decline.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "senior.decline.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "senior.decline.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "senior.decline.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "senior.casual_request.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "senior.casual_request.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "senior.casual_request.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "senior.casual_request.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "senior.casual_request.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "senior.casual_request.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "senior.casual_request.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "senior.casual_request.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "senior.casual_request.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "senior.casual_request.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "senior.casual_request.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "senior.casual_request.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "friend.schedule.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "friend.schedule.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "friend.schedule.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "friend.schedule.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "friend.schedule.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "friend.schedule.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "friend.schedule.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "friend.schedule.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "friend.schedule.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "friend.schedule.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "friend.schedule.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "friend.schedule.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "friend.thanks_check.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "friend.thanks_check.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "friend.thanks_check.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "friend.thanks_check.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "friend.thanks_check.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "friend.thanks_check.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "friend.thanks_check.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "friend.thanks_check.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "friend.thanks_check.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "friend.thanks_check.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "friend.thanks_check.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "friend.thanks_check.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "friend.ask.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "friend.ask.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "friend.ask.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "friend.ask.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "friend.ask.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "friend.ask.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "friend.ask.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "friend.ask.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "friend.ask.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "friend.ask.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "friend.ask.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "friend.ask.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "friend.apologize.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "friend.apologize.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "friend.apologize.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "friend.apologize.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "friend.apologize.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "friend.apologize.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "friend.apologize.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "friend.apologize.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "friend.apologize.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "friend.apologize.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "friend.apologize.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "friend.apologize.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "friend.decline.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "friend.decline.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "friend.decline.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "friend.decline.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "friend.decline.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "friend.decline.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "friend.decline.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "friend.decline.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "friend.decline.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "friend.decline.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "friend.decline.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "friend.decline.yongyong.3"
    },
    {
      "ruleId": "speech.seumnida.tone.1",
      "templateId": "friend.express_feelings.seumnida.1"
    },
    {
      "ruleId": "speech.seumnida.tone.2",
      "templateId": "friend.express_feelings.seumnida.2"
    },
    {
      "ruleId": "speech.seumnida.tone.3",
      "templateId": "friend.express_feelings.seumnida.3"
    },
    {
      "ruleId": "speech.haeyo.tone.1",
      "templateId": "friend.express_feelings.haeyo.1"
    },
    {
      "ruleId": "speech.haeyo.tone.2",
      "templateId": "friend.express_feelings.haeyo.2"
    },
    {
      "ruleId": "speech.haeyo.tone.3",
      "templateId": "friend.express_feelings.haeyo.3"
    },
    {
      "ruleId": "speech.ida.tone.1",
      "templateId": "friend.express_feelings.ida.1"
    },
    {
      "ruleId": "speech.ida.tone.2",
      "templateId": "friend.express_feelings.ida.2"
    },
    {
      "ruleId": "speech.ida.tone.3",
      "templateId": "friend.express_feelings.ida.3"
    },
    {
      "ruleId": "speech.yongyong.tone.1",
      "templateId": "friend.express_feelings.yongyong.1"
    },
    {
      "ruleId": "speech.yongyong.tone.2",
      "templateId": "friend.express_feelings.yongyong.2"
    },
    {
      "ruleId": "speech.yongyong.tone.3",
      "templateId": "friend.express_feelings.yongyong.3"
    }
  ],
  "frameCount": 24,
  "reviewStatus": "approved",
  "setCount": 96,
  "templateCount": 288,
  "version": "t25-approved-2026-07-21.1"
} as const satisfies TemplateManifest
