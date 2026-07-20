import fs from 'node:fs'

const [assembledPath, outputPath] = process.argv.slice(2)

if (!assembledPath || !outputPath) {
  console.error('Usage: node ua-arch-prepare.js <assembled-graph.json> <ua-arch-input.json>')
  process.exit(1)
}

try {
  const graph = JSON.parse(fs.readFileSync(assembledPath, 'utf8'))
  const fileTypes = new Set([
    'file',
    'config',
    'document',
    'service',
    'pipeline',
    'table',
    'schema',
    'resource',
    'endpoint',
  ])
  const fileNodes = graph.nodes.filter((node) => fileTypes.has(node.type))
  const fileNodeIds = new Set(fileNodes.map((node) => node.id))
  const allEdges = graph.edges.filter(
    (edge) => fileNodeIds.has(edge.source) && fileNodeIds.has(edge.target),
  )
  const importEdges = allEdges.filter((edge) => edge.type === 'imports')

  fs.writeFileSync(
    outputPath,
    `${JSON.stringify({ fileNodes, importEdges, allEdges }, null, 2)}\n`,
    'utf8',
  )
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error))
  process.exit(1)
}
