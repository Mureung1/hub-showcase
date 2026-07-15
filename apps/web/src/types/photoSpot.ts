export type SpotKind = "official" | "candidate";

export type PhotoSpot = {
  id: string;
  kind: SpotKind;
  name: string;
  area: string;
  description: string;
  latitude: number;
  longitude: number;
  likes?: number;
  threshold?: number;
  imageTone: "grove" | "lake" | "stage" | "plaza";
};

export type ProposalDraft = {
  latitude: number;
  longitude: number;
  address: string;
  frame: "solo" | "couple";
  imageName: string | null;
};
