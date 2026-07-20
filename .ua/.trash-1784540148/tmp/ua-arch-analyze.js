import fs from 'node:fs'
import path from 'node:path'

const [inputPath, outputPath] = process.argv.slice(2)

if (!inputPath || !outputPath) {
  console.error('Usage: node ua-arch-analyze.js <input.json> <output.json>')
  process.exit(1)
}

const normalizePath = (value) => String(value || '').replaceAll('\\', '/')
const sortedObject = (entries) =>
  Object.fromEntries(
    [...entries].sort(([left], [right]) => left.localeCompare(right)),
  )
const increment = (map, key, amount = 1) => map.set(key, (map.get(key) || 0) + amount)

function commonDirectoryPrefix(filePaths) {
  if (filePaths.length === 0) return []
  const directoryParts = filePaths.map((filePath) => {
    const parts = normalizePath(filePath).split('/').filter(Boolean)
    return parts.slice(0, -1)
  })
  const prefix = []
  const shortestLength = Math.min(...directoryParts.map((parts) => parts.length))
  for (let index = 0; index < shortestLength; index += 1) {
    const segment = directoryParts[0][index]
    if (!directoryParts.every((parts) => parts[index] === segment)) break
    prefix.push(segment)
  }
  return prefix
}

function flatGroupName(filePath) {
  const normalized = normalizePath(filePath)
  const basename = path.posix.basename(normalized).toLowerCase()
  if (
    /\.(test|spec)\.[^.]+$/.test(basename) ||
    /^test_/.test(basename) ||
    /_test\.[^.]+$/.test(basename)
  ) return 'test'
  if (
    basename.includes('.config.') ||
    ['package.json', 'cargo.toml', 'go.mod', 'gemfile', 'pom.xml', 'build.gradle'].includes(basename)
  ) return 'config'
  const extension = path.posix.extname(basename).slice(1)
  return extension || 'root'
}

function directoryPattern(groupName) {
  const name = groupName.toLowerCase()
  const patterns = new Map([
    ['api', new Set(['routes', 'api', 'controllers', 'endpoints', 'handlers', 'serializers', 'controller', 'routers', 'blueprints'])],
    ['service', new Set(['services', 'core', 'lib', 'domain', 'logic', 'signals', 'internal', 'composables', 'mailers', 'jobs', 'channels'])],
    ['data', new Set(['models', 'db', 'data', 'persistence', 'repository', 'entities', 'migrations', 'entity', 'sql', 'database', 'schema'])],
    ['ui', new Set(['components', 'views', 'pages', 'ui', 'layouts', 'screens'])],
    ['middleware', new Set(['middleware', 'plugins', 'interceptors', 'guards'])],
    ['utility', new Set(['utils', 'helpers', 'common', 'shared', 'tools', 'templatetags', 'pkg'])],
    ['config', new Set(['config', 'constants', 'env', 'settings', 'management', 'commands'])],
    ['test', new Set(['__tests__', 'test', 'tests', 'spec', 'specs', 'src/test/java'])],
    ['types', new Set(['types', 'interfaces', 'schemas', 'contracts', 'dtos', 'dto', 'request', 'response'])],
    ['hooks', new Set(['hooks'])],
    ['state', new Set(['store', 'state', 'reducers', 'actions', 'slices'])],
    ['assets', new Set(['assets', 'static', 'public'])],
    ['entry', new Set(['cmd', 'bin'])],
    ['documentation', new Set(['docs', 'documentation', 'wiki'])],
    ['infrastructure', new Set(['deploy', 'deployment', 'infra', 'infrastructure', 'k8s', 'kubernetes', 'helm', 'charts', 'terraform', 'tf', 'docker'])],
    ['ci-cd', new Set(['.github', '.gitlab', '.circleci'])],
  ])
  for (const [label, names] of patterns) {
    if (names.has(name)) return label
  }
  return null
}

function filePattern(filePath) {
  const normalized = normalizePath(filePath)
  const lower = normalized.toLowerCase()
  const basename = path.posix.basename(lower)
  if (
    /\.(test|spec)\.[^.]+$/.test(basename) ||
    /^test_/.test(basename) ||
    /_test\.(go|rb)$/.test(basename) ||
    /(test|tests)\.(java|php|cs)$/.test(basename)
  ) return 'test'
  if (basename.endsWith('.d.ts')) return 'types'
  if (['index.ts', 'index.js', '__init__.py'].includes(basename)) return 'entry'
  if (basename === 'manage.py') return 'entry'
  if (['wsgi.py', 'asgi.py'].includes(basename)) return 'config'
  if (lower.includes('/cmd/') && basename === 'main.go') return 'entry'
  if (lower.includes('/src/') && ['main.rs', 'lib.rs'].includes(basename)) return 'entry'
  if (['application.java', 'program.cs', 'config.ru'].includes(basename)) return 'entry'
  if (['cargo.toml', 'go.mod', 'gemfile', 'pom.xml', 'build.gradle', 'composer.json'].includes(basename)) return 'config'
  if (basename === 'dockerfile' || basename.startsWith('docker-compose.')) return 'infrastructure'
  if (basename.endsWith('.tf') || basename.endsWith('.tfvars')) return 'infrastructure'
  if (
    lower.startsWith('.github/workflows/') ||
    basename === '.gitlab-ci.yml' ||
    basename === 'jenkinsfile'
  ) return 'ci-cd'
  if (basename.endsWith('.sql')) return 'data'
  if (/\.(graphql|gql|proto)$/.test(basename)) return 'types'
  if (/\.(md|rst)$/.test(basename)) return 'documentation'
  if (basename === 'makefile') return 'infrastructure'
  return null
}

try {
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  const { fileNodes, importEdges, allEdges } = input
  if (!Array.isArray(fileNodes) || !Array.isArray(importEdges) || !Array.isArray(allEdges)) {
    throw new Error('Input must contain fileNodes, importEdges, and allEdges arrays')
  }

  const idToNode = new Map(fileNodes.map((node) => [node.id, node]))
  const filePaths = fileNodes.map((node) => normalizePath(node.filePath))
  const prefixSegments = commonDirectoryPrefix(filePaths)
  const allDirectories = new Set(
    filePaths.map((filePath) => path.posix.dirname(filePath)),
  )
  const flatStructure = allDirectories.size === 1

  const directoryGroups = new Map()
  const idToGroup = new Map()
  for (const node of fileNodes) {
    const normalized = normalizePath(node.filePath)
    const parts = normalized.split('/').filter(Boolean)
    let group
    if (flatStructure) {
      group = flatGroupName(normalized)
    } else {
      const remaining = parts.slice(prefixSegments.length)
      group = remaining.length > 1 ? remaining[0] : 'root'
    }
    if (!directoryGroups.has(group)) directoryGroups.set(group, [])
    directoryGroups.get(group).push(node.id)
    idToGroup.set(node.id, group)
  }
  for (const ids of directoryGroups.values()) ids.sort()

  const nodeTypeGroups = new Map()
  for (const node of fileNodes) {
    if (!nodeTypeGroups.has(node.type)) nodeTypeGroups.set(node.type, [])
    nodeTypeGroups.get(node.type).push(node.id)
  }
  for (const ids of nodeTypeGroups.values()) ids.sort()

  const fanIn = new Map(fileNodes.map((node) => [node.id, 0]))
  const fanOut = new Map(fileNodes.map((node) => [node.id, 0]))
  const importAdjacency = new Map(fileNodes.map((node) => [node.id, []]))
  const importsFromGroups = new Map([...directoryGroups.keys()].map((group) => [group, new Set()]))
  const importedByGroups = new Map([...directoryGroups.keys()].map((group) => [group, new Set()]))
  const interGroupCount = new Map()

  for (const edge of importEdges) {
    if (!idToNode.has(edge.source) || !idToNode.has(edge.target)) continue
    increment(fanOut, edge.source)
    increment(fanIn, edge.target)
    importAdjacency.get(edge.source).push(edge.target)
    const sourceGroup = idToGroup.get(edge.source)
    const targetGroup = idToGroup.get(edge.target)
    if (sourceGroup !== targetGroup) {
      importsFromGroups.get(sourceGroup).add(targetGroup)
      importedByGroups.get(targetGroup).add(sourceGroup)
      increment(interGroupCount, `${sourceGroup}\u0000${targetGroup}`)
    }
  }
  for (const targets of importAdjacency.values()) targets.sort()

  const crossCategoryCount = new Map()
  const nonCodeConnections = []
  for (const edge of allEdges) {
    const sourceNode = idToNode.get(edge.source)
    const targetNode = idToNode.get(edge.target)
    if (!sourceNode || !targetNode) continue
    increment(crossCategoryCount, `${sourceNode.type}\u0000${targetNode.type}\u0000${edge.type}`)
    if (sourceNode.type !== 'file' || targetNode.type !== 'file') {
      nonCodeConnections.push({
        source: edge.source,
        target: edge.target,
        edgeType: edge.type,
      })
    }
  }

  const intraGroupDensity = {}
  for (const group of [...directoryGroups.keys()].sort()) {
    let internalEdges = 0
    let totalEdges = 0
    for (const edge of importEdges) {
      const sourceGroup = idToGroup.get(edge.source)
      const targetGroup = idToGroup.get(edge.target)
      if (sourceGroup === group || targetGroup === group) {
        totalEdges += 1
        if (sourceGroup === group && targetGroup === group) internalEdges += 1
      }
    }
    intraGroupDensity[group] = {
      internalEdges,
      totalEdges,
      density: totalEdges === 0 ? 0 : Number((internalEdges / totalEdges).toFixed(4)),
    }
  }

  const patternMatches = {}
  for (const group of [...directoryGroups.keys()].sort()) {
    const match = directoryPattern(group)
    if (match) patternMatches[group] = match
  }
  const filePatternMatches = {}
  for (const node of fileNodes) {
    const match = filePattern(node.filePath)
    if (match) filePatternMatches[node.id] = match
  }

  const lowerPaths = filePaths.map((filePath) => filePath.toLowerCase())
  const isDockerfile = (filePath) => path.posix.basename(filePath) === 'dockerfile'
  const isCompose = (filePath) => path.posix.basename(filePath).startsWith('docker-compose.')
  const isK8s = (filePath) => /(^|\/)(k8s|kubernetes|helm|charts)(\/|$)/.test(filePath)
  const isTerraform = (filePath) => filePath.endsWith('.tf') || filePath.endsWith('.tfvars')
  const isCi = (filePath) =>
    filePath.startsWith('.github/workflows/') ||
    path.posix.basename(filePath) === '.gitlab-ci.yml' ||
    path.posix.basename(filePath) === 'jenkinsfile' ||
    filePath.startsWith('.circleci/')
  const infraFiles = filePaths.filter(
    (filePath) =>
      isDockerfile(filePath) ||
      isCompose(filePath) ||
      isK8s(filePath) ||
      isTerraform(filePath) ||
      isCi(filePath),
  )
  const environmentConfigs = lowerPaths.filter(
    (filePath) =>
      /(dockerfile|docker-compose)[.-](dev|prod|staging|test)/.test(filePath) ||
      /\.(dev|prod|staging|test)\.(ya?ml|json|toml)$/.test(filePath),
  )

  const schemaFiles = fileNodes
    .filter(
      (node) =>
        ['table', 'schema', 'endpoint'].includes(node.type) ||
        /\.(sql|graphql|gql|proto|prisma)$/i.test(node.filePath),
    )
    .map((node) => normalizePath(node.filePath))
  const migrationFiles = [...new Set(schemaFiles.filter((filePath) => /(^|\/)migrations?\//i.test(filePath)))]
  const dataModelFiles = fileNodes
    .filter((node) => {
      const tags = new Set((node.tags || []).map((tag) => String(tag).toLowerCase()))
      const filePath = normalizePath(node.filePath).toLowerCase()
      return (
        tags.has('data-model') ||
        tags.has('repository') ||
        /(^|\/)(models?|data|repositories?|db|database)(\/|$)/.test(filePath)
      )
    })
    .map((node) => normalizePath(node.filePath))
  const apiHandlerFiles = fileNodes
    .filter((node) => {
      const tags = new Set((node.tags || []).map((tag) => String(tag).toLowerCase()))
      const filePath = normalizePath(node.filePath).toLowerCase()
      return (
        tags.has('api-handler') ||
        tags.has('endpoint') ||
        /(^|\/)(routes?|controllers?|handlers?|endpoints?)(\/|$)/.test(filePath)
      )
    })
    .map((node) => normalizePath(node.filePath))

  const groupsWithDocs = new Set()
  for (const node of fileNodes) {
    if (node.type === 'document') groupsWithDocs.add(idToGroup.get(node.id))
  }
  for (const edge of allEdges) {
    if (edge.type !== 'documents') continue
    const targetGroup = idToGroup.get(edge.target)
    if (targetGroup) groupsWithDocs.add(targetGroup)
  }
  const allGroupNames = [...directoryGroups.keys()].sort()

  const dependencyDirection = []
  const groups = [...directoryGroups.keys()].sort()
  for (let leftIndex = 0; leftIndex < groups.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < groups.length; rightIndex += 1) {
      const left = groups[leftIndex]
      const right = groups[rightIndex]
      const leftToRight = interGroupCount.get(`${left}\u0000${right}`) || 0
      const rightToLeft = interGroupCount.get(`${right}\u0000${left}`) || 0
      if (leftToRight > rightToLeft) {
        dependencyDirection.push({ dependent: left, dependsOn: right })
      } else if (rightToLeft > leftToRight) {
        dependencyDirection.push({ dependent: right, dependsOn: left })
      }
    }
  }

  const result = {
    scriptCompleted: true,
    commonPathPrefix: prefixSegments.length ? `${prefixSegments.join('/')}/` : '',
    flatStructure,
    directoryGroups: sortedObject(directoryGroups.entries()),
    nodeTypeGroups: sortedObject(nodeTypeGroups.entries()),
    importAdjacency: sortedObject(
      [...importAdjacency.entries()].map(([id, targets]) => [id, targets]),
    ),
    directoryGroupAdjacency: sortedObject(
      [...directoryGroups.keys()].map((group) => [
        group,
        {
          importsFrom: [...importsFromGroups.get(group)].sort(),
          importedBy: [...importedByGroups.get(group)].sort(),
        },
      ]),
    ),
    crossCategoryEdges: [...crossCategoryCount.entries()]
      .map(([key, count]) => {
        const [fromType, toType, edgeType] = key.split('\u0000')
        return { fromType, toType, edgeType, count }
      })
      .sort((left, right) =>
        `${left.fromType}:${left.toType}:${left.edgeType}`.localeCompare(
          `${right.fromType}:${right.toType}:${right.edgeType}`,
        ),
      ),
    nonCodeConnections: nonCodeConnections.sort((left, right) =>
      `${left.source}:${left.target}:${left.edgeType}`.localeCompare(
        `${right.source}:${right.target}:${right.edgeType}`,
      ),
    ),
    interGroupImports: [...interGroupCount.entries()]
      .map(([key, count]) => {
        const [from, to] = key.split('\u0000')
        return { from, to, count }
      })
      .sort((left, right) => `${left.from}:${left.to}`.localeCompare(`${right.from}:${right.to}`)),
    intraGroupDensity,
    patternMatches,
    filePatternMatches,
    deploymentTopology: {
      hasDockerfile: lowerPaths.some(isDockerfile),
      hasCompose: lowerPaths.some(isCompose),
      hasK8s: lowerPaths.some(isK8s),
      hasTerraform: lowerPaths.some(isTerraform),
      hasCI: lowerPaths.some(isCi),
      infraFiles: [...new Set(infraFiles)].sort(),
      environmentConfigs: [...new Set(environmentConfigs)].sort(),
    },
    dataPipeline: {
      schemaFiles: [...new Set(schemaFiles)].sort(),
      migrationFiles: [...new Set(migrationFiles)].sort(),
      dataModelFiles: [...new Set(dataModelFiles)].sort(),
      apiHandlerFiles: [...new Set(apiHandlerFiles)].sort(),
    },
    docCoverage: {
      groupsWithDocs: groupsWithDocs.size,
      totalGroups: directoryGroups.size,
      coverageRatio:
        directoryGroups.size === 0
          ? 0
          : Number((groupsWithDocs.size / directoryGroups.size).toFixed(4)),
      documentedGroups: [...groupsWithDocs].sort(),
      undocumentedGroups: allGroupNames.filter((group) => !groupsWithDocs.has(group)),
    },
    dependencyDirection,
    fileStats: {
      totalFileNodes: fileNodes.length,
      filesPerGroup: sortedObject(
        [...directoryGroups.entries()].map(([group, ids]) => [group, ids.length]),
      ),
      nodeTypeCounts: sortedObject(
        [...nodeTypeGroups.entries()].map(([type, ids]) => [type, ids.length]),
      ),
      importEdgeCount: importEdges.length,
      allFileLevelEdgeCount: allEdges.length,
    },
    fileFanIn: sortedObject(fanIn.entries()),
    fileFanOut: sortedObject(fanOut.entries()),
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error))
  process.exit(1)
}
