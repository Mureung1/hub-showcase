import { describe, expect, it } from 'vitest'
import { loadKnowledgeChunks, searchKnowledgeChunks } from './jsonlKnowledgeRepository.mjs'

const path = {
  join: (...parts) => parts.join('/'),
}

function createFs(files) {
  return {
    existsSync: (filePath) => Object.hasOwn(files, filePath),
    readFileSync: (filePath) => files[filePath],
  }
}

describe('jsonl knowledge repository', () => {
  it('loads valid JSONL chunks and normalizes metadata', () => {
    const fs = createFs({
      '/repo/data/docker-docs-chunks.jsonl': [
        JSON.stringify({
          docTitle: 'Docker overview',
          sectionHeading: 'Build images',
          chunkText: 'Use Dockerfile instructions to build container images.',
          url: 'https://docs.docker.com/build/',
          sourcePath: 'guides/build.md',
        }),
        '{broken json',
        JSON.stringify({ docTitle: '', chunkText: 'missing title', url: 'https://docs.docker.com/' }),
      ].join('\n'),
    })

    const chunks = loadKnowledgeChunks({ fs, path, repoRoot: '/repo' })

    expect(chunks).toEqual([
      {
        id: 'docker-docs-chunks.jsonl:1',
        docTitle: 'Docker overview',
        sectionHeading: 'Build images',
        chunkText: 'Use Dockerfile instructions to build container images.',
        url: 'https://docs.docker.com/build/',
        sourcePath: 'guides/build.md',
        sourceType: 'official-doc',
        topic: 'docker',
      },
    ])
  })

  it('returns an empty list when a configured source file is missing', () => {
    const chunks = loadKnowledgeChunks({ fs: createFs({}), path, repoRoot: '/repo' })

    expect(chunks).toEqual([])
  })

  it('searches chunks by topic, title, section, and text', () => {
    const chunks = [
      {
        id: 'docker-docs-chunks.jsonl:1',
        topic: 'docker',
        docTitle: 'Docker build guide',
        sectionHeading: 'Images',
        chunkText: 'Build and tag container images.',
      },
      {
        id: 'react-docs-chunks.jsonl:1',
        topic: 'react',
        docTitle: 'React state guide',
        sectionHeading: 'State updates',
        chunkText: 'Components can update UI with state.',
      },
    ]

    const results = searchKnowledgeChunks({ chunks, query: 'docker image', limit: 1 })

    expect(results).toEqual([chunks[0]])
  })
})