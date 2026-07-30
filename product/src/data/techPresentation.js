const TECH_ICON_BY_SLUG = Object.freeze({
  'bundling-build': 'build-tool',
  'caching-performance': 'redis',
  'cicd-automation': 'cicd',
  'cicd-pipeline': 'cicd',
  'cloud-deploy': 'aws',
  'cloud-infra': 'aws',
  'cloud-network': 'cloud-network',
  'container-deploy': 'docker',
  'css-architecture': 'css',
  'data-warehouse': 'database',
  'dl-framework': 'pytorch',
  'frontend-testing': 'testing',
  'iac-terraform': 'terraform',
  'java-spring': 'spring',
  'kotlin-android': 'android',
  kubernetes: 'kubernetes',
  'llm-app': 'ai',
  'message-queue': 'kafka',
  'model-serving': 'model-serving',
  'network-api': 'api',
  'network-security': 'security',
  'node-typescript': 'node',
  python: 'python',
  'rdb-modeling': 'database',
  'react-component': 'react',
  'react-ui': 'react',
  'rest-api': 'api',
  'soc-siem': 'security',
  'spark-batch': 'spark',
  'sql-analytics': 'database',
  'state-management': 'state-management',
  'store-release': 'store-release',
  'streaming-ingest': 'streaming',
  'swift-ios': 'swift',
  'typescript-typing': 'typescript',
  'unity-csharp': 'unity',
  'unreal-cpp': 'unreal',
  'web-accessibility': 'accessibility',
  'web-performance': 'performance',
  'workflow-orchestration': 'workflow',
})

export const DEMO_TECH_SLUGS = Object.freeze(Object.keys(TECH_ICON_BY_SLUG))

export function getTechIconPath(slug) {
  const icon = TECH_ICON_BY_SLUG[slug] ?? 'technology'
  return `/logos/${icon}.svg`
}

export function getHeatmapLevel(pct) {
  if (pct === null || pct === undefined || pct === '') return null
  const value = Number(pct)
  if (!Number.isFinite(value)) return null
  if (value <= 30) return { label: '약', tone: 1 }
  if (value < 70) return { label: '중', tone: 2 }
  return { label: '강', tone: 3 }
}
