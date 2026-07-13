import { z } from 'zod'
import {
  CAMPUS_IDS,
  IsoDateSchema,
  IsoDateTimeSchema,
  NoticeTypeSchema,
  createUniquePrimitiveArraySchema,
} from '../schemas/commonSchemas.js'
import { parseCrawledNotice } from '../schemas/crawledNoticeSchema.js'
import {
  AdapterContextSchema,
  createAdapterId,
} from './adapterContext.js'

const KNU_INSTITUTION_KEY = 'kangwon.ac.kr'
const KNU_INSTITUTION_ID = 'kangwon'
const KNU_HOST = 'www.kangwon.ac.kr'
const KNU_CRAWLER_VERSION = '0.4.4'
const KNU_TIMEZONE = 'Asia/Seoul'
const KNU_DEDUPE_KEY = 'institution + category + pstSn'
const SHA256_PATTERN = /^[0-9a-f]{64}$/

const SourceNonEmptyStringSchema = z
  .string()
  .refine((value) => value.trim().length > 0, 'Expected a non-empty string.')
const SourceSchemaVersionSchema = z.enum([
  'noticepilot.normalizedNotice.v0.3',
  'noticepilot.normalizedNotice.v0.4',
])
const SourceBoardIdSchema = z.string().regex(/^\d+$/)
const NullableSha256Schema = z.string().regex(SHA256_PATTERN).nullable()
const SourceCampusIdSchema = z.enum([
  ...CAMPUS_IDS,
  'all',
  'unknown',
])

function collapseWhitespace(value) {
  return value.trim().replace(/\s+/g, ' ')
}

function arraysEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function parseDetailUrl(value) {
  const url = new URL(value)
  const pathMatch = url.pathname.match(/^\/ko\/bbs\/(\d+)\/detail\.do$/)
  const postIds = url.searchParams.getAll('pstSn')

  if (
    url.protocol !== 'https:' ||
    url.hostname !== KNU_HOST ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== '' ||
    url.hash !== '' ||
    pathMatch === null ||
    postIds.length !== 1 ||
    postIds[0].trim() === ''
  ) {
    return null
  }

  return {
    boardId: pathMatch[1],
    postId: postIds[0],
  }
}

function isValidKnuAttachmentUrl(value) {
  try {
    const url = new URL(value)
    const requiredParameters = ['dn', 'path', 'fn']

    return (
      url.protocol === 'https:' &&
      url.hostname === KNU_HOST &&
      url.port === '' &&
      url.username === '' &&
      url.password === '' &&
      url.pathname === '/ko/cmmn/download.do' &&
      url.hash === '' &&
      requiredParameters.every((parameter) => {
        const values = url.searchParams.getAll(parameter)
        return values.length === 1 && values[0].trim() !== ''
      })
    )
  } catch {
    return false
  }
}

function classifyListedCampus(rawValue) {
  const rawLabel = collapseWhitespace(rawValue ?? '') || null

  if (rawLabel === null) {
    return { rawLabel: null, campuses: [], scope: 'unknown' }
  }

  if (rawLabel.toUpperCase() === 'ALL' || rawLabel.includes('전체')) {
    return { rawLabel, campuses: [...CAMPUS_IDS], scope: 'all' }
  }

  const campuses = []

  if (rawLabel.includes('춘천')) campuses.push('chuncheon')
  if (rawLabel.includes('삼척')) campuses.push('samcheok')
  if (rawLabel.includes('도계')) campuses.push('dogye')
  if (rawLabel.includes('강릉') || rawLabel.includes('원주')) {
    campuses.push('gangneung_wonju')
  }

  if (campuses.length === 0) {
    return { rawLabel, campuses: [], scope: 'unknown' }
  }

  if (campuses.length === CAMPUS_IDS.length) {
    return { rawLabel, campuses: [...CAMPUS_IDS], scope: 'all' }
  }

  return { rawLabel, campuses, scope: 'specific' }
}

function sourceCampusScopeToClassification(campusScope) {
  if (campusScope.scopeType === 'all_campuses') {
    return { campuses: [...CAMPUS_IDS], scope: 'all' }
  }

  if (campusScope.scopeType === 'unknown') {
    return { campuses: [], scope: 'unknown' }
  }

  if (campusScope.campuses.length === CAMPUS_IDS.length) {
    return { campuses: [...CAMPUS_IDS], scope: 'all' }
  }

  return { campuses: campusScope.campuses, scope: 'specific' }
}

const SourceBoardPayloadSchema = z
  .object({
    boardId: SourceBoardIdSchema,
    name: SourceNonEmptyStringSchema,
    category: SourceNonEmptyStringSchema,
    priority: z.number().int(),
    aliasBoardIds: createUniquePrimitiveArraySchema(SourceBoardIdSchema),
  })
  .strict()

const SourceListMetadataSchema = z
  .object({
    row_index: z.number().int().positive(),
    board_id: SourceBoardIdSchema,
    pst_sn: SourceNonEmptyStringSchema,
    url: z.string().url(),
    title: SourceNonEmptyStringSchema,
    notice_no: z.string().nullable(),
    campus: z.string().nullable(),
    author: z.string().nullable(),
    published_at: IsoDateSchema.nullable(),
    views: z.string(),
    is_pinned: z.boolean(),
    parse_source: SourceNonEmptyStringSchema,
  })
  .strict()

const SourceAttachmentStatusSchema = z.enum([
  'metadata_only',
  'skipped_by_probe_download_first',
  'downloaded',
  'failed_invalid_content',
  'failed_exception',
])

const SourceAttachmentSchema = z
  .object({
    index: z.number().int().positive(),
    display_name: SourceNonEmptyStringSchema,
    download_url: z.string().url(),
    server_name: z.string().nullable(),
    path: z.string().nullable(),
    downloaded: z.boolean(),
    status: SourceAttachmentStatusSchema,
    elapsed_ms: z.number().nonnegative().nullable(),
    size_bytes: z.number().int().nonnegative().nullable(),
    detected_type: z.string().nullable(),
    sha256: NullableSha256Schema,
    local_path: z.string().nullable(),
    error: z.string().nullable(),
  })
  .strict()
  .superRefine((attachment, context) => {
    if (!isValidKnuAttachmentUrl(attachment.download_url)) {
      context.addIssue({
        code: 'custom',
        message: 'Expected a valid KNU attachment download URL.',
        path: ['download_url'],
      })
    }

    const isNotRequested =
      attachment.status === 'metadata_only' ||
      attachment.status === 'skipped_by_probe_download_first'
    const isFailed =
      attachment.status === 'failed_invalid_content' ||
      attachment.status === 'failed_exception'

    if (
      isNotRequested &&
      (attachment.downloaded ||
        attachment.size_bytes !== null ||
        attachment.sha256 !== null ||
        attachment.local_path !== null ||
        attachment.error !== null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A metadata-only or skipped attachment cannot have download output.',
        path: ['status'],
      })
    }

    if (
      attachment.status === 'downloaded' &&
      (!attachment.downloaded ||
        attachment.size_bytes === null ||
        attachment.size_bytes <= 0 ||
        attachment.sha256 === null ||
        attachment.error !== null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A downloaded attachment requires a positive size and SHA-256.',
        path: ['status'],
      })
    }

    if (
      isFailed &&
      (attachment.downloaded ||
        attachment.sha256 !== null ||
        attachment.error === null ||
        attachment.error.trim() === '')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A failed attachment requires a non-empty source error.',
        path: ['status'],
      })
    }
  })

const SourceCampusScopeSchema = z
  .object({
    sourceLabel: z.string().nullable(),
    campuses: createUniquePrimitiveArraySchema(SourceCampusIdSchema, { min: 1 }),
    scopeType: z.enum(['campus_specific', 'all_campuses', 'unknown']),
    confidence: z.enum(['high', 'medium', 'low']),
    source: z.enum([
      'listMetadata.campus',
      'title_or_body',
      'listMetadata.author',
      'none',
    ]),
    labels: z.record(z.string(), z.string()),
  })
  .strict()
  .superRefine((campusScope, context) => {
    if (
      campusScope.scopeType === 'all_campuses' &&
      !arraysEqual(campusScope.campuses, ['all'])
    ) {
      context.addIssue({
        code: 'custom',
        message: 'all_campuses requires only the all sentinel.',
        path: ['campuses'],
      })
    }

    if (
      campusScope.scopeType === 'unknown' &&
      !arraysEqual(campusScope.campuses, ['unknown'])
    ) {
      context.addIssue({
        code: 'custom',
        message: 'unknown requires only the unknown sentinel.',
        path: ['campuses'],
      })
    }

    if (
      campusScope.scopeType === 'campus_specific' &&
      campusScope.campuses.some((campus) => !CAMPUS_IDS.includes(campus))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'campus_specific requires only physical campus IDs.',
        path: ['campuses'],
      })
    }

    if (
      campusScope.source === 'none' &&
      campusScope.scopeType !== 'unknown'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A none campus source requires unknown scope.',
        path: ['scopeType'],
      })
    }
  })

const KnuNormalizedNoticeSchema = z
  .object({
    schemaVersion: SourceSchemaVersionSchema,
    noticeId: SourceNonEmptyStringSchema,
    institution: z.literal(KNU_INSTITUTION_KEY),
    sourceSystem: SourceNonEmptyStringSchema,
    board: SourceBoardPayloadSchema,
    sourceUrl: z.string().url(),
    pstSn: SourceNonEmptyStringSchema,
    title: SourceNonEmptyStringSchema,
    publishedAt: IsoDateSchema.nullable(),
    timezone: z.literal(KNU_TIMEZONE),
    listMetadata: SourceListMetadataSchema,
    rawHtml: z
      .object({
        path: SourceNonEmptyStringSchema,
        sha256: NullableSha256Schema,
      })
      .strict(),
    extractedText: z.string(),
    extractedTextChars: z.number().int().nonnegative(),
    textExtractionStatus: z.enum(['body_html_extracted', 'empty_body']),
    attachments: z.array(SourceAttachmentSchema),
    attachmentCount: z.number().int().nonnegative(),
    attachmentRequiredForFullExtraction: z.boolean(),
    contentHash: z.string().regex(SHA256_PATTERN),
    crawler: z
      .object({
        version: z.literal(KNU_CRAWLER_VERSION),
        userAgent: SourceNonEmptyStringSchema,
        crawledAt: IsoDateTimeSchema,
      })
      .strict(),
    campusScope: SourceCampusScopeSchema,
  })
  .strict()
  .superRefine((notice, context) => {
    const detailUrl = parseDetailUrl(notice.sourceUrl)

    if (detailUrl === null) {
      context.addIssue({
        code: 'custom',
        message: 'Expected a valid KNU detail URL.',
        path: ['sourceUrl'],
      })
    } else {
      if (detailUrl.boardId !== notice.board.boardId) {
        context.addIssue({
          code: 'custom',
          message: 'Source URL board ID must match the payload board ID.',
          path: ['sourceUrl'],
        })
      }

      if (detailUrl.postId !== notice.pstSn) {
        context.addIssue({
          code: 'custom',
          message: 'Source URL pstSn must match the payload pstSn.',
          path: ['sourceUrl'],
        })
      }
    }

    const duplicatePairs = [
      [notice.board.boardId, notice.listMetadata.board_id, 'board_id'],
      [notice.pstSn, notice.listMetadata.pst_sn, 'pst_sn'],
      [notice.sourceUrl, notice.listMetadata.url, 'url'],
      [notice.title, notice.listMetadata.title, 'title'],
      [notice.publishedAt, notice.listMetadata.published_at, 'published_at'],
    ]

    for (const [topLevelValue, listValue, field] of duplicatePairs) {
      if (topLevelValue !== listValue) {
        context.addIssue({
          code: 'custom',
          message: `Expected ${field} to match its normalized notice value.`,
          path: ['listMetadata', field],
        })
      }
    }

    if (notice.attachmentCount !== notice.attachments.length) {
      context.addIssue({
        code: 'custom',
        message: 'attachmentCount must equal attachments.length.',
        path: ['attachmentCount'],
      })
    }

    notice.attachments.forEach((attachment, index) => {
      if (attachment.index !== index + 1) {
        context.addIssue({
          code: 'custom',
          message: 'Attachment indexes must be unique, ordered, and one-based.',
          path: ['attachments', index, 'index'],
        })
      }
    })

    if (notice.extractedTextChars !== notice.extractedText.length) {
      context.addIssue({
        code: 'custom',
        message: 'extractedTextChars must equal the JavaScript string length.',
        path: ['extractedTextChars'],
      })
    }

    if (
      notice.textExtractionStatus === 'body_html_extracted' &&
      notice.extractedText.trim() === ''
    ) {
      context.addIssue({
        code: 'custom',
        message: 'body_html_extracted requires non-empty extractedText.',
        path: ['extractedText'],
      })
    }

    if (
      notice.textExtractionStatus === 'empty_body' &&
      (notice.extractedText !== '' || notice.extractedTextChars !== 0)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'empty_body requires empty extractedText.',
        path: ['extractedText'],
      })
    }

    if (notice.campusScope.source === 'listMetadata.campus') {
      const listedCampus = classifyListedCampus(notice.listMetadata.campus)
      const hintedCampus = sourceCampusScopeToClassification(notice.campusScope)
      const hintedLabel = collapseWhitespace(notice.campusScope.sourceLabel ?? '')

      if (
        hintedLabel !== (listedCampus.rawLabel ?? '') ||
        hintedCampus.scope !== listedCampus.scope ||
        !arraysEqual(hintedCampus.campuses, listedCampus.campuses)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'listMetadata.campus hint must match listed classification.',
          path: ['campusScope'],
        })
      }
    }
  })

const KnuBoardRegistryEntrySchema = z
  .object({
    boardId: SourceBoardIdSchema,
    name: SourceNonEmptyStringSchema,
    category: SourceNonEmptyStringSchema,
    priority: z.number().int(),
    canonical: z.boolean(),
    aliasBoardIds: createUniquePrimitiveArraySchema(SourceBoardIdSchema),
    listHasApplicationPeriod: z.boolean().optional(),
    dedupeKey: z.literal(KNU_DEDUPE_KEY),
  })
  .strict()
  .superRefine((board, context) => {
    if (board.aliasBoardIds.includes(board.boardId)) {
      context.addIssue({
        code: 'custom',
        message: 'A registry board cannot alias itself.',
        path: ['aliasBoardIds'],
      })
    }
  })

const KnuBoardRegistrySchema = z.array(KnuBoardRegistryEntrySchema).min(1)

const KnuAdapterArgumentsSchema = z
  .object({
    normalizedNotice: KnuNormalizedNoticeSchema,
    boardRegistry: KnuBoardRegistrySchema,
    context: AdapterContextSchema,
  })
  .strict()

function selectCanonicalRegistryBoard(boardRegistry, observedBoardId) {
  const matches = boardRegistry.filter(
    (board) =>
      board.boardId === observedBoardId ||
      board.aliasBoardIds.includes(observedBoardId),
  )

  if (matches.length !== 1 || !matches[0].canonical) {
    throw new TypeError(
      'Expected exactly one canonical registry board for the observed board ID.',
    )
  }

  return matches[0]
}

function assertPayloadBoardMatchesRegistry(payloadBoard, registryBoard) {
  if (
    payloadBoard.name !== registryBoard.name ||
    payloadBoard.category !== registryBoard.category ||
    payloadBoard.priority !== registryBoard.priority ||
    !arraysEqual(payloadBoard.aliasBoardIds, registryBoard.aliasBoardIds)
  ) {
    throw new TypeError('Payload board metadata must match the canonical registry.')
  }
}

function getFileExtension(fileName) {
  const match = fileName.match(/\.([a-zA-Z0-9]+)$/)
  return match === null ? null : match[1].toLowerCase()
}

function mapAttachment(attachment, fetchedAt, context) {
  const failedErrorCodes = {
    failed_invalid_content: 'source_invalid_content',
    failed_exception: 'source_download_exception',
  }

  return {
    attachmentId: createAdapterId(context, 'attachment'),
    fileName: attachment.display_name,
    sourceUrl: attachment.download_url,
    serverName: attachment.server_name,
    sourcePath: attachment.path,
    mediaType: attachment.detected_type,
    fileExtension: getFileExtension(attachment.display_name),
    fetchedAt: attachment.status === 'downloaded' ? fetchedAt : null,
    sizeBytes: attachment.size_bytes,
    contentHash: attachment.sha256,
    extractionStatus:
      attachment.status === 'downloaded'
        ? 'downloaded'
        : attachment.status.startsWith('failed_')
          ? 'failed'
          : 'not_requested',
    normalizedText: null,
    errorCode: failedErrorCodes[attachment.status] ?? null,
  }
}

export function normalizeKnuV044ToCrawledNotice(input) {
  const { normalizedNotice, boardRegistry, context } =
    KnuAdapterArgumentsSchema.parse(input)
  const registryBoard = selectCanonicalRegistryBoard(
    boardRegistry,
    normalizedNotice.board.boardId,
  )

  assertPayloadBoardMatchesRegistry(normalizedNotice.board, registryBoard)

  const noticeTypeResult = NoticeTypeSchema.safeParse(registryBoard.category)
  const crawledNoticeId = createAdapterId(context, 'crawled_notice')
  const attachments = normalizedNotice.attachments.map((attachment) =>
    mapAttachment(attachment, normalizedNotice.crawler.crawledAt, context),
  )

  return parseCrawledNotice({
    schemaVersion: 1,
    crawledNoticeId,
    institutionId: KNU_INSTITUTION_ID,
    sourceInstitutionKey: normalizedNotice.institution,
    sourceBoard: {
      boardId: registryBoard.boardId,
      institutionId: KNU_INSTITUTION_ID,
      boardKey: `knu-bbs-${registryBoard.boardId}`,
      displayName: registryBoard.name,
      category: registryBoard.category,
      canonical: registryBoard.canonical,
      aliasBoardIds: registryBoard.aliasBoardIds,
      listUrl: `https://${KNU_HOST}/ko/bbs/${registryBoard.boardId}/list.do`,
      ...(noticeTypeResult.success
        ? { noticeTypeHint: noticeTypeResult.data }
        : {}),
      supportedCampusFilters: [],
    },
    sourcePostId: normalizedNotice.pstSn,
    sourceUrl: normalizedNotice.sourceUrl,
    canonicalSourceUrl: `https://${KNU_HOST}/ko/bbs/${registryBoard.boardId}/detail.do?pstSn=${encodeURIComponent(normalizedNotice.pstSn)}`,
    title: normalizedNotice.title,
    publishedAt: normalizedNotice.publishedAt,
    fetchedAt: normalizedNotice.crawler.crawledAt,
    contentText: normalizedNotice.extractedText,
    contentExtractionStatus:
      normalizedNotice.textExtractionStatus === 'body_html_extracted'
        ? 'extracted'
        : 'empty',
    listedCampusClassification: classifyListedCampus(
      normalizedNotice.listMetadata.campus,
    ),
    attachments,
    rawSourceHash: normalizedNotice.rawHtml.sha256,
    contentHash: normalizedNotice.contentHash,
    sourceIdentityKey: `${KNU_INSTITUTION_ID}:${registryBoard.category}:${normalizedNotice.pstSn}`,
    crawlStatus: 'active',
  })
}
