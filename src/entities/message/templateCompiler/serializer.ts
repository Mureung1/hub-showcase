import type { CompiledTemplateArtifact } from './contracts.js'

export const generatedTemplatesPath =
  'src/entities/message/templateCompiler/generated/templates.generated.ts'
export const generatedManifestPath =
  'src/entities/message/templateCompiler/generated/manifest.generated.json'

const prettyJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

export const serializeTemplateArtifact = (artifact: CompiledTemplateArtifact) => ({
  manifestJson: prettyJson(artifact.manifest),
  templatesTypeScript: `import type { CompiledTemplate, TemplateManifest } from '../contracts.js'

export const generatedTemplates = ${JSON.stringify(artifact.entries, null, 2)} as const satisfies readonly CompiledTemplate[]

export const generatedTemplateManifest = ${JSON.stringify(artifact.manifest, null, 2)} as const satisfies TemplateManifest
`,
})
