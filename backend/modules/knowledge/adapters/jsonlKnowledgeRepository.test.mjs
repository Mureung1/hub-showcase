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

  it('loads React JSONL chunks from title and content aliases', () => {
    const fs = createFs({
      '/repo/data/react_docs.jsonl': JSON.stringify({
        title: 'React state guide',
        content: 'Components can remember values with state and update the UI.',
        url: 'https://ko.react.dev/learn/state-a-components-memory',
      }),
    })

    const chunks = loadKnowledgeChunks({ fs, path, repoRoot: '/repo' })

    expect(chunks).toEqual([
      {
        id: 'react_docs.jsonl:1',
        docTitle: 'React state guide',
        sectionHeading: 'React state guide',
        chunkText: 'Components can remember values with state and update the UI.',
        url: 'https://ko.react.dev/learn/state-a-components-memory',
        sourcePath: 'https://ko.react.dev/learn/state-a-components-memory',
        sourceType: 'official-doc',
        topic: 'react',
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
        id: 'react_docs.jsonl:1',
        topic: 'react',
        docTitle: 'React state guide',
        sectionHeading: 'State updates',
        chunkText: 'Components can update UI with state.',
      },
    ]

    const results = searchKnowledgeChunks({ chunks, query: 'docker image', limit: 1 })

    expect(results).toEqual([chunks[0]])
  })

  it('prioritizes React chunks for React learning goals', () => {
    const chunks = [
      {
        id: 'docker-docs-chunks.jsonl:1',
        topic: 'docker',
        docTitle: 'Docker build guide',
        sectionHeading: 'Images',
        chunkText: 'Build and tag container images.',
      },
      {
        id: 'react_docs.jsonl:1',
        topic: 'react',
        docTitle: 'React state guide',
        sectionHeading: 'State updates',
        chunkText: 'Components can update UI with state.',
      },
    ]

    const results = searchKnowledgeChunks({ chunks, query: 'React state component', limit: 1 })

    expect(results).toEqual([chunks[1]])
  })
  it('prioritizes React learn docs over deprecated API references', () => {
    const chunks = [
      {
        id: 'react_docs.jsonl:1',
        topic: 'react',
        docTitle: 'unmountComponentAtNode',
        sectionHeading: 'unmountComponentAtNode',
        chunkText: 'Deprecated legacy API for removing a component from the DOM.',
        url: 'https://ko.react.dev/reference/react-dom/unmountComponentAtNode',
      },
      {
        id: 'react_docs.jsonl:2',
        topic: 'react',
        docTitle: 'Quick Start',
        sectionHeading: 'Components and state',
        chunkText: 'Learn components and state in React applications.',
        url: 'https://ko.react.dev/learn',
      },
    ]

    const results = searchKnowledgeChunks({ chunks, query: 'React state component', limit: 1 })

    expect(results).toEqual([chunks[1]])
  })
})
