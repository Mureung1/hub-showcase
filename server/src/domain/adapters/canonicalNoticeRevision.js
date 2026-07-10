import { createAdapterId } from './adapterContext.js'

export function resolveCanonicalNoticeRevision({
  previousCanonicalNotice,
  contentHash,
  context,
}) {
  const isFirstRevision = previousCanonicalNotice === null
  const contentChanged =
    !isFirstRevision && previousCanonicalNotice.contentHash !== contentHash

  return {
    noticeId: isFirstRevision
      ? createAdapterId(context, 'canonical_notice')
      : previousCanonicalNotice.noticeId,
    revision: isFirstRevision
      ? 1
      : previousCanonicalNotice.revision + (contentChanged ? 1 : 0),
    createdAt: isFirstRevision ? context.now : previousCanonicalNotice.createdAt,
    updatedAt: context.now,
  }
}
