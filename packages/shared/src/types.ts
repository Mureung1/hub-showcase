export type ScenarioKey = "sunny" | "rain" | "cold" | "heat";
export type ChannelId = "instagram" | "x" | "dangol";
export type Tone = "up" | "down";

export interface Coupon {
  used: number;
  revenue: number;
}

export interface Scenario {
  label: string; emoji: string; temp: string; cond: string;
  diagText: string; diagTone: Tone;
  bars: number[]; barToday: number; todayDown: boolean;
  normalSales: number; predSales: number; target: number;
  impTone: Tone; impHead: string; impDetail: string;
  title: string; copy: string; promo: string;
  channels: ChannelId[]; coupon: Coupon;
}

export interface ChannelMeta {
  id: ChannelId;
  icon: string;
  label: string;
  desc: string;
  legal: boolean;
}

export interface HistoryItem {
  emoji: string;
  title: string;
  date: string;
  used: number;
  total: number;
  revenue: number;
}
