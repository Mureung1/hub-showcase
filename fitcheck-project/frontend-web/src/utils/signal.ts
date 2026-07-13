import type { Member, MemberWithStatus, SignalStatus } from '../types';
import { getDaysSince } from './date';

export const STATUS_LABEL: Record<SignalStatus, string> = {
  red: '주의',
  yellow: '관심',
  green: '정상',
};

export function getSignalStatus(daysSince: number): SignalStatus {
  if (daysSince >= 7) return 'red';
  if (daysSince >= 3) return 'yellow';
  return 'green';
}

export function enrichMember(member: Member): MemberWithStatus {
  const daysSinceContact = getDaysSince(member.lastContactDate);
  return {
    ...member,
    daysSinceContact,
    status: getSignalStatus(daysSinceContact),
  };
}

export function enrichMembers(members: Member[]): MemberWithStatus[] {
  return members.map(enrichMember);
}
