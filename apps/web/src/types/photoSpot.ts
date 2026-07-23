export type SpotKind = "official" | "candidate";

export type PhotoSpot = {
  id: string;
  kind: SpotKind;
  name: string;
  area: string;
  description: string;
  placeCategory: string;
  address: string;
  placeTip: string;
  latitude: number;
  longitude: number;
  likes?: number;
  threshold?: number;
  imageTone: "grove" | "lake" | "stage" | "plaza";
};

export type ShotFrame = {
  id: string;
  title: string;
  subtitle: string;
  people: "solo" | "couple";
  tone: PhotoSpot["imageTone"];
  guide: string;
};

export type ProposalDraft = {
  latitude: number;
  longitude: number;
  address: string;
  frame: "solo" | "couple";
  imageName: string | null;
};
