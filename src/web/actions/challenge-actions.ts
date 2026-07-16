'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCoreAdapter } from '../adapters/core/registry';
import type { ActionState } from '../errors/action-state';
import { toActionState } from '../errors/domain-error-map';
import { requireSession } from '../auth/session';
import { headers } from 'next/headers';
import { getPaymentAdapter } from '../adapters/payment/registry';
import { getServerEnv } from '../config/server-env';

export async function joinUserChallengeAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const challengeId = String(formData.get('challengeId') ?? '');
  if (!challengeId) return { status: 'error', message: '챌린지 식별자가 필요합니다.' };
  const ctx = await requireSession(`/challenges/${challengeId}`);
  const result = await getCoreAdapter().joinUserChallenge(ctx, { challengeId });
  if (!result.ok) return toActionState(result.error);
  revalidatePath(`/challenges/${challengeId}`);
  return { status: 'success', message: '참가가 완료되었습니다.', data: { participationId: result.value.participationId, balanceAfter: result.value.balanceAfter } };
}

export async function createUserChallengeAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const input = { title: String(formData.get('title') ?? '').trim(), description: String(formData.get('description') ?? '').trim(), startsOn: String(formData.get('startsOn') ?? ''), endsOn: String(formData.get('endsOn') ?? ''), dailyMinutes: Number(formData.get('dailyMinutes')), verificationDeadline: String(formData.get('verificationDeadline') ?? ''), capacity: Number(formData.get('capacity')), entryPoints: Number(formData.get('entryPoints')), eliminationRule: String(formData.get('eliminationRule') ?? '').trim(), visibility: formData.get('visibility') === 'private' ? 'private' as const : 'public' as const };
  const fieldErrors: Record<string, readonly string[]> = {};
  if (input.title.length < 2) fieldErrors.title = ['제목을 2자 이상 입력해 주세요.'];
  if (input.description.length < 10) fieldErrors.description = ['설명을 10자 이상 입력해 주세요.'];
  if (!input.startsOn || !input.endsOn || input.startsOn >= input.endsOn) fieldErrors.endsOn = ['종료일은 시작일보다 뒤여야 합니다.'];
  if (!Number.isInteger(input.dailyMinutes) || input.dailyMinutes < 10 || input.dailyMinutes > 480) fieldErrors.dailyMinutes = ['10–480분 사이로 입력해 주세요.'];
  if (!Number.isInteger(input.capacity) || input.capacity < 2 || input.capacity > 1000) fieldErrors.capacity = ['2–1000명 사이로 입력해 주세요.'];
  if (!Number.isInteger(input.entryPoints) || input.entryPoints < 0) fieldErrors.entryPoints = ['0 이상의 정수 Point를 입력해 주세요.'];
  if (Object.keys(fieldErrors).length) return { status: 'error', message: '입력값을 확인해 주세요.', fieldErrors };
  const ctx = await requireSession('/challenges/new');
  const result = await getCoreAdapter().createUserChallenge(ctx, input);
  if (!result.ok) return toActionState(result.error);
  redirect(`/challenges/${result.value.challengeId}`);
}

export async function startOfficialCheckoutAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const pointDiscount = Math.max(0, Number(formData.get('pointDiscount') ?? 0));
  const ctx = await requireSession('/official-challenge');
  const quote = await getCoreAdapter().getOfficialCheckoutQuote(ctx, { pointDiscount });
  if (!quote.ok) return toActionState(quote.error);
  if (quote.value.status !== 'recruiting') return { status: 'error', message: '현재 공식 챌린지 모집이 마감되었습니다.' };
  const provider = getPaymentAdapter(getServerEnv().paymentProvider);
  if (!provider.isConfigured()) return { status: 'error', message: `결제 Provider가 아직 구성되지 않았습니다. 결제 예정 금액은 ${quote.value.amountMinor.toLocaleString()}원입니다.` };
  const origin = (await headers()).get('origin') ?? 'http://localhost:3000';
  const checkout = await provider.createCheckoutSession({ externalReference: quote.value.externalReference, userId: ctx.sessionUserId, challengeId: quote.value.challengeId, amountMinor: quote.value.amountMinor, currency: quote.value.currency, pointDiscount: quote.value.pointDiscount, returnUrl: new URL('/official-challenge/payment/return', origin).toString() });
  if (!checkout.ok) return toActionState(checkout.error);
  redirect(checkout.value.checkoutUrl);
}
