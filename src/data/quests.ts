import type { Quest, SocialQuestShard } from "../domain/types";

export const seedQuest: Quest = {
  id: "q-cert-db-15m",
  title: "DB 개념 15분 정리",
  type: "time",
  detail: "정보처리기사 필기 중 데이터베이스 핵심 개념을 정리한다.",
  target: "교재 10페이지를 읽고 헷갈리는 용어 3개를 표시한다.",
  rewardExp: 40,
  deadlineLabel: "오늘 23:59",
  visibility: "private",
};

export const weeklyQuestPlan = [
  { day: "월", title: "DB 개념 15분", status: "완료" },
  { day: "화", title: "기출 5문제", status: "오늘" },
  { day: "수", title: "오답 3개 정리", status: "대기" },
  { day: "목", title: "운영체제 15분", status: "대기" },
  { day: "금", title: "복습 노트 작성", status: "대기" },
];

export const socialQuestShards: SocialQuestShard[] = [
  {
    id: "shard-1",
    title: "오늘 10분만 걷기",
    ownerLabel: "익명의 파트너",
    motif: "star",
    visibility: "anonymous_public",
  },
  {
    id: "shard-2",
    title: "단어 20개 복습",
    ownerLabel: "밤공부 친구",
    motif: "flower",
    visibility: "anonymous_public",
  },
  {
    id: "shard-3",
    title: "포트폴리오 문장 3개 고치기",
    ownerLabel: "미래의 동료",
    motif: "scrap",
    visibility: "friends_only",
  },
];
