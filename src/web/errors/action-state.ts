export interface ActionState { readonly status: 'idle' | 'success' | 'error'; readonly message?: string; readonly fieldErrors?: Readonly<Record<string, readonly string[]>>; readonly recoveryHref?: string; readonly traceId?: string; readonly data?: Readonly<Record<string, string | number>> }
export const initialActionState: ActionState = { status: 'idle' };
