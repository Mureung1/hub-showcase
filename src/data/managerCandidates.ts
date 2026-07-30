import { defaultLumiPetId, type PetId } from "./assetManifest";
import type { ManagerState } from "../domain/appState";
import { createInitialManagerStats } from "../domain/statGrowth";

export interface ManagerCandidate {
  petId: PetId;
  name: string;
  title: string;
  description: string;
}

export const defaultManagerCandidatePetId = defaultLumiPetId;

export const managerCandidates: readonly ManagerCandidate[] = [
  {
    petId: "pink-manager",
    name: "루미",
    title: "분홍 전자 매니저",
    description: "밝은 반응과 큰 동작이 잘 보이는 기본 매니저",
  },
  {
    petId: "glass-frog",
    name: "글라",
    title: "유리 개구리 매니저",
    description: "조용한 움직임과 점프 동작이 어울리는 매니저",
  },
  {
    petId: "planaria",
    name: "플라",
    title: "플라나리아 매니저",
    description: "작고 단순한 형태로 시작하는 샘플 매니저",
  },
  {
    petId: "costasiella-kuroshimae",
    name: "코스타",
    title: "코스타시엘라 매니저",
    description: "말랑한 바다 민달팽이 실루엣과 붙잡기 동작이 어울리는 매니저",
  },
  {
    petId: "fried-egg-jellyfish",
    name: "프라이",
    title: "계란후라이 해파리 매니저",
    description: "둥근 해파리 형태와 부드러운 떠다니기 동작이 잘 보이는 매니저",
  },
  {
    petId: "sea-bunny-slug",
    name: "버니",
    title: "바다토끼 매니저",
    description: "작은 바다토끼 형태와 귀여운 기어오르기 동작이 특징인 매니저",
  },
];

export function createInitialManagerState(): ManagerState {
  const defaultCandidate = managerCandidates.find((candidate) => candidate.petId === defaultManagerCandidatePetId);

  return {
    name: defaultCandidate?.name ?? "루미",
    petId: defaultManagerCandidatePetId,
    level: 1,
    exp: 0,
    stats: createInitialManagerStats(),
    mood: "waiting",
    line: "기다리고 있었어. 오늘 할 분량은 네가 정해도 돼.",
    behaviorStyle: "balanced",
    unlockedStages: ["stage-1"],
    selectedStage: null,
    soundEnabled: false,
  };
}
