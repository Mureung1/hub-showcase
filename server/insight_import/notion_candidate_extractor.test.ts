import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  extractNotionCandidates,
  type NotionFieldMapping,
} from './notion_candidate_extractor';

const dataSource = readFixture('notion_data_source.json');
const pages = readFixture('notion_pages.json') as unknown[];
const blocks = readFixture('notion_blocks.json') as Array<{
  block: unknown;
  collectionPath: string[];
}>;

describe('extractNotionCandidates', () => {
  it('명시적 URL 속성과 안전한 본문 블록만 표준 후보로 만든다', () => {
    const result = extractNotionCandidates({
      blocks,
      dataSources: [dataSource],
      includePageUrls: false,
      pages: pages.map((page) => ({
        collectionPath: ['업무 자료', '개발'],
        page,
      })),
    });

    expect(result.mappingRequests).toEqual([]);
    expect(result.candidates).toContainEqual({
      candidateId: 'notion:block:block-id:bookmark',
      capturedAtCandidate: null,
      collectionPath: ['업무 자료', '개발'],
      explicitMemoCandidate: null,
      originalUrl: 'https://example.com/bookmark',
      sourceLocation: 'Notion 업무 자료 / 개발 · 북마크 블록',
      titleCandidate: '아키텍처 문서',
      warnings: [],
    });
    expect(result.candidates.map(({ originalUrl }) => originalUrl)).toEqual(
      expect.arrayContaining([
        'https://example.com/property',
        'https://example.net/href',
        'https://example.org/plain',
      ])
    );
    expect(result.candidates.map(({ originalUrl }) => originalUrl)).not.toEqual(
      expect.arrayContaining([
        'https://notion.so/page-id',
        'https://example.com/image.png',
        'https://example.com/caption',
      ])
    );
  });

  it('page 자체 URL과 memo는 명시적으로 선택한 경우에만 포함한다', () => {
    const mappings: NotionFieldMapping[] = [
      {
        dataSourceId: 'data-source-id',
        memoPropertyId: 'memo-property',
        titlePropertyId: null,
        urlPropertyId: 'url-property',
      },
    ];
    const result = extractNotionCandidates({
      blocks: [],
      dataSources: [dataSource],
      includePageUrls: true,
      mappings,
      pages: pages.map((page) => ({
        collectionPath: ['업무 자료', '개발'],
        page,
      })),
    });

    expect(result.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          explicitMemoCandidate: '명시적 메모',
          originalUrl: 'https://example.com/property',
        }),
        expect.objectContaining({
          candidateId: 'notion:page:page-id:self',
          originalUrl: 'https://notion.so/page-id',
        }),
      ])
    );
  });

  it('URL 후보 field가 둘이면 추출 대신 mapping을 요청한다', () => {
    const ambiguousSource = structuredClone(dataSource) as {
      properties: Record<string, unknown>;
    };
    ambiguousSource.properties['대체 링크'] = {
      id: 'alternate-property',
      name: '대체 링크',
      type: 'rich_text',
    };
    const ambiguousPages = pages.map((page) => {
      const copy = structuredClone(page) as {
        properties: Record<string, unknown>;
      };
      copy.properties['대체 링크'] = {
        id: 'alternate-property',
        rich_text: [
          { href: null, plain_text: 'https://example.com/alternate' },
        ],
        type: 'rich_text',
      };
      return { collectionPath: ['업무 자료'], page: copy };
    });

    const result = extractNotionCandidates({
      blocks,
      dataSources: [ambiguousSource],
      includePageUrls: false,
      pages: ambiguousPages,
    });

    expect(result.candidates).toEqual([]);
    expect(result.mappingRequests).toEqual([
      expect.objectContaining({
        dataSourceId: 'data-source-id',
        dataSourceName: '업무 자료',
        fields: expect.arrayContaining([
          expect.objectContaining({ id: 'url-property', type: 'url' }),
          expect.objectContaining({
            id: 'alternate-property',
            type: 'rich_text',
          }),
        ]),
      }),
    ]);
  });

  it('선택한 rich_text URL 속성은 전체 속성 조회를 요청하고 결과를 후보로 만든다', () => {
    const richTextSource = structuredClone(dataSource) as {
      properties: Record<string, unknown>;
    };
    richTextSource.properties['링크'] = {
      id: 'url-property',
      name: '링크',
      type: 'rich_text',
    };
    const richTextPages = pages.map((page) => {
      const copy = structuredClone(page) as {
        properties: Record<string, unknown>;
      };
      copy.properties['링크'] = {
        id: 'url-property',
        rich_text: [{ href: null, plain_text: 'https://example.com/embedded' }],
        type: 'rich_text',
      };
      return { collectionPath: ['업무 자료'], page: copy };
    });
    const mappings: NotionFieldMapping[] = [
      {
        dataSourceId: 'data-source-id',
        memoPropertyId: 'memo-property',
        titlePropertyId: null,
        urlPropertyId: 'url-property',
      },
    ];

    const queued = extractNotionCandidates({
      blocks: [],
      dataSources: [richTextSource],
      includePageUrls: false,
      mappings,
      pages: richTextPages,
    }) as ReturnType<typeof extractNotionCandidates> & {
      propertyRequests: unknown[];
    };

    expect(queued.candidates).toEqual([]);
    expect(queued.propertyRequests).toEqual([
      {
        collectionPath: ['업무 자료'],
        explicitMemoCandidate: '명시적 메모',
        pageId: 'page-id',
        propertyId: 'url-property',
        titleCandidate: '개발',
      },
    ]);

    const extracted = extractNotionCandidates({
      blocks: [],
      dataSources: [],
      includePageUrls: false,
      pages: [],
      propertyItems: [
        {
          collectionPath: ['업무 자료'],
          explicitMemoCandidate: '명시적 메모',
          index: 25,
          item: {
            rich_text: {
              href: 'https://example.com/full-property',
              plain_text: '전체 속성',
            },
          },
          pageId: 'page-id',
          propertyId: 'url-property',
          titleCandidate: '개발',
        },
      ],
    } as Parameters<typeof extractNotionCandidates>[0] & {
      propertyItems: unknown[];
    });

    expect(extracted.candidates).toContainEqual(
      expect.objectContaining({
        candidateId: 'notion:page:page-id:property:url-property:25:href',
        explicitMemoCandidate: '명시적 메모',
        originalUrl: 'https://example.com/full-property',
        titleCandidate: '개발',
      })
    );
  });
});

function readFixture(name: string) {
  return JSON.parse(
    readFileSync(new URL(`./testing/${name}`, import.meta.url), 'utf8')
  ) as unknown;
}
