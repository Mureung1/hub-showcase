export const SCENE_OBSERVATION_TIMES = ["10:00", "13:00", "15:00", "18:00"] as const;

export type SceneObservationTime = (typeof SCENE_OBSERVATION_TIMES)[number];

export type SceneObservation = {
  time: SceneObservationTime;
  congestionLabel: "낮음" | "보통" | "높음" | "매우 높음";
  displayObjectCount: number;
  sourceType: "fixture" | "manual_observation" | "public_data";
  sourceLabel: string;
  basis: string;
};

export type SceneCrowdPosition = {
  x: number;
  z: number;
};

const WALKABLE_ZONE = {
  minX: 0.2,
  maxX: 0.8,
  minZ: 0.55,
  maxZ: 0.78,
} as const;

const EXCLUDED_ZONE = {
  minX: 0.45,
  maxX: 0.56,
  minZ: 0.6,
  maxZ: 0.7,
} as const;

export const GWANPYEONG_SCENE_OBSERVATIONS: readonly SceneObservation[] = [
  {
    time: "10:00",
    congestionLabel: "낮음",
    displayObjectCount: 5,
    sourceType: "fixture",
    sourceLabel: "개발용 관찰 fixture",
    basis: "시간대 전환과 공간 배치 검증용 값이며 실제 유동인구가 아닙니다.",
  },
  {
    time: "13:00",
    congestionLabel: "높음",
    displayObjectCount: 18,
    sourceType: "fixture",
    sourceLabel: "개발용 관찰 fixture",
    basis: "시간대 전환과 공간 배치 검증용 값이며 실제 유동인구가 아닙니다.",
  },
  {
    time: "15:00",
    congestionLabel: "보통",
    displayObjectCount: 11,
    sourceType: "fixture",
    sourceLabel: "개발용 관찰 fixture",
    basis: "시간대 전환과 공간 배치 검증용 값이며 실제 유동인구가 아닙니다.",
  },
  {
    time: "18:00",
    congestionLabel: "매우 높음",
    displayObjectCount: 24,
    sourceType: "fixture",
    sourceLabel: "개발용 관찰 fixture",
    basis: "시간대 전환과 공간 배치 검증용 값이며 실제 유동인구가 아닙니다.",
  },
];

export function findSceneObservation(
  observations: readonly SceneObservation[],
  time: SceneObservationTime,
) {
  const observation = observations.find((candidate) => candidate.time === time);
  if (!observation) throw new Error(`Scene observation is missing for ${time}.`);
  return observation;
}

function seededFraction(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export function createSceneCrowdPositions(
  time: SceneObservationTime,
  count: number,
): SceneCrowdPosition[] {
  const timeSeed = Number(time.slice(0, 2)) * 100;
  const positions: SceneCrowdPosition[] = [];
  for (let candidate = 0; positions.length < count && candidate < count * 8 + 32; candidate += 1) {
    const x =
      WALKABLE_ZONE.minX +
      seededFraction(timeSeed + candidate * 2) * (WALKABLE_ZONE.maxX - WALKABLE_ZONE.minX);
    const z =
      WALKABLE_ZONE.minZ +
      seededFraction(timeSeed + candidate * 2 + 1) *
        (WALKABLE_ZONE.maxZ - WALKABLE_ZONE.minZ);
    const isExcluded =
      x >= EXCLUDED_ZONE.minX &&
      x <= EXCLUDED_ZONE.maxX &&
      z >= EXCLUDED_ZONE.minZ &&
      z <= EXCLUDED_ZONE.maxZ;
    if (!isExcluded) positions.push({ x, z });
  }
  return positions;
}
