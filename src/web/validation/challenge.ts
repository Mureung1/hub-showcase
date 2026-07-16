import type { CreateUserChallengeInput } from '../dto/challenge';
export function hasCashField(value: Record<string, unknown>): boolean { return 'cashFee' in value || 'entryFee' in value || 'amountMinor' in value; }
export function isCreateChallengeInput(value: Partial<CreateUserChallengeInput>): value is CreateUserChallengeInput { return Boolean(value.title && value.description && value.startsOn && value.endsOn && value.verificationDeadline && value.eliminationRule && Number.isInteger(value.dailyMinutes) && Number.isInteger(value.capacity) && Number.isInteger(value.entryPoints)); }
