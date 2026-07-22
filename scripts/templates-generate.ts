import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { compileTemplateArtifact } from '../src/entities/message/templateCompiler/compiler.js'
import {
  generatedManifestPath,
  generatedTemplatesPath,
  serializeTemplateArtifact,
} from '../src/entities/message/templateCompiler/serializer.js'

export const generateTemplateArtifacts = () => {
  const serialized = serializeTemplateArtifact(compileTemplateArtifact())
  mkdirSync(dirname(generatedTemplatesPath), { recursive: true })
  writeFileSync(generatedTemplatesPath, serialized.templatesTypeScript, 'utf8')
  writeFileSync(generatedManifestPath, serialized.manifestJson, 'utf8')
  return serialized
}

generateTemplateArtifacts()
