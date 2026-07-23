export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export const POSE_SEGMENTS = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"], ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"], ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"], ["right_shoulder", "right_hip"], ["left_hip", "right_hip"],
  ["left_hip", "left_knee"], ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"], ["right_knee", "right_ankle"],
];

export function createPersonFrame(landmarks, index) {
  const visible = landmarks.filter((point) => (point.visibility ?? 1) >= 0.45);
  if (visible.length < 4) return null;

  const xs = visible.map((point) => point.x);
  const ys = visible.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const paddingX = Math.max(0.05, (maxX - minX) * 0.24);
  const paddingY = Math.max(0.05, (maxY - minY) * 0.16);
  const x = clamp(minX - paddingX);
  const y = clamp(minY - paddingY);
  const right = clamp(maxX + paddingX);
  const bottom = clamp(maxY + paddingY);

  return {
    x,
    y,
    width: Math.max(0.12, right - x),
    height: Math.max(0.2, bottom - y),
    label: index === 0 ? "Left person" : "Right person",
  };
}

export function selectFrames(landmarkSets, mode) {
  const frames = landmarkSets
    .map((landmarks, index) => createPersonFrame(landmarks, index))
    .filter(Boolean)
    .sort((a, b) => b.width * b.height - a.width * a.height);

  const selected = mode === "solo" ? frames.slice(0, 1) : frames.slice(0, 2);
  return selected
    .sort((a, b) => a.x - b.x)
    .map((frame, index) => ({
      ...frame,
      label: mode === "solo" ? "Subject" : index === 0 ? "Left person" : "Right person",
    }));
}

export function scaleFrames(frames, scalePercent) {
  const ratio = scalePercent / 100;
  return frames.map((frame) => {
    const width = clamp(frame.width * ratio, 0.08, 0.9);
    const height = clamp(frame.height * ratio, 0.15, 0.92);
    return {
      ...frame,
      width,
      height,
      x: clamp(frame.x + (frame.width - width) / 2, 0, 1 - width),
      y: clamp(frame.y + (frame.height - height) / 2, 0, 1 - height),
    };
  });
}

export function createGuide({
  personFrames,
  personOutlines = [],
  personPoses = [],
  backgroundLines = [],
  analysisMeta = {},
}) {
  return {
    version: 3,
    backgroundLines,
    personFrames,
    personOutlines,
    personPoses,
    poseSegments: POSE_SEGMENTS,
    analysisMeta,
  };
}
