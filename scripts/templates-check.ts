import { readFileSync } from 'node:fs'
import { compileTemplateArtifact } from '../src/entities/message/templateCompiler/compiler.js'
import {
  generatedManifestPath,
  generatedTemplatesPath,
  serializeTemplateArtifact,
} from '../src/entities/message/templateCompiler/serializer.js'

export const assertTemplateArtifactsCurrent = (
  actualTemplates = readFileSync(generatedTemplatesPath, 'utf8'),
  actualManifest = readFileSync(generatedManifestPath, 'utf8'),
) => {
  const expected = serializeTemplateArtifact(compileTemplateArtifact())
  const driftedPaths = [
    ...(actualTemplates === expected.templatesTypeScript ? [] : [generatedTemplatesPath]),
    ...(actualManifest === expected.manifestJson ? [] : [generatedManifestPath]),
  ]
  if (driftedPaths.length > 0) {
    throw new Error(
      `Template artifacts are out of date: ${driftedPaths.join(', ')}. Run npm run templates:generate.`,
    )
  }
}

assertTemplateArtifactsCurrent()
