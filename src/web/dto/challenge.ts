export type OfficialCampaignStatus = 'coming-soon' | 'recruiting' | 'closed' | 'in-progress' | 'ended';
export type OfficialViewerState = 'anonymous' | 'eligible' | 'joined';
export type OfficialCtaVariant = 'coming-soon' | 'recruiting-anonymous' | 'recruiting-eligible' | 'closed' | 'ended' | 'joined-complete-today' | 'joined-action-required';

export interface CampaignContentBlock { readonly heading: string; readonly body: string; readonly items?: readonly string[] }
export interface CampaignStepDto { readonly title: string; readonly description: string; readonly state?: 'complete' | 'current' | 'upcoming' }
export interface CampaignScheduleItemDto { readonly label: string; readonly value: string }
export interface CampaignFaqItemDto { readonly id: string; readonly question: string; readonly answer: string }

export interface FeaturedOfficialChallengeDto {
  readonly challengeId: string;
  readonly title: string;
  readonly summary: string;
  readonly status: OfficialCampaignStatus;
  readonly viewerState: OfficialViewerState;
  readonly ctaVariant: OfficialCtaVariant;
  readonly now: string;
  readonly recruitmentStartsAt: string | null;
  readonly recruitmentEndsAt: string | null;
  readonly challengeStartsAt: string;
  readonly challengeEndsAt: string;
  readonly dailyMinutes: number;
  readonly entryPoints: number;
  readonly sections: {
    readonly outcomes: readonly CampaignContentBlock[];
    readonly forWhom: readonly CampaignContentBlock[];
    readonly dailyRoutine: readonly CampaignContentBlock[];
    readonly howItWorks: readonly CampaignStepDto[];
    readonly verification: readonly CampaignContentBlock[];
    readonly rewards: readonly CampaignContentBlock[];
    readonly schedule: readonly CampaignScheduleItemDto[];
    readonly faq: readonly CampaignFaqItemDto[];
  };
  readonly participation: null | { readonly participationId: string; readonly todayVerification: 'complete' | 'incomplete' | 'not-required'; readonly verificationDeadlineAt: string | null };
  readonly source?: 'real' | 'mock';
}

export interface UserChallengeSearchInput { readonly query?: string; readonly status?: 'recruiting' | 'closed' | 'all'; readonly cursor?: string }
export interface UserChallengeCardDto {
  readonly challengeId: string; readonly title: string; readonly summary: string; readonly startsOn: string; readonly endsOn: string;
  readonly entryPoints: number; readonly dailyMinutes: number; readonly status: 'recruiting' | 'closed' | 'in-progress' | 'ended';
  readonly participantCount: number; readonly capacity: number; readonly source?: 'real' | 'mock';
}
export interface UserChallengeListDto { readonly items: readonly UserChallengeCardDto[]; readonly nextCursor: string | null }
export interface UserChallengeDetailDto extends UserChallengeCardDto { readonly description: string; readonly verificationDeadline: string; readonly eliminationRule: string; readonly visibility: 'public' | 'private'; readonly walletBalance?: number }
export interface CreateUserChallengeInput {
  readonly title: string; readonly description: string; readonly startsOn: string; readonly endsOn: string; readonly dailyMinutes: number;
  readonly verificationDeadline: string; readonly capacity: number; readonly entryPoints: number; readonly eliminationRule: string; readonly visibility: 'public' | 'private';
}
export interface JoinResultDto { readonly participationId: string; readonly balanceAfter: number }
