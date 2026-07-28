import { createRoot } from 'react-dom/client'

import type { TargetProductBootstrap } from '@ay-ple/product-contract'

import { WorkspaceLifecycleView } from '../src/workspace-lifecycle-view.js'
import '../src/index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Workspace lifecycle target root is missing')

void fetch('/api/product/bootstrap', {
  cache: 'no-store',
})
  .then(async (response) => {
    if (!response.ok) {
      throw new Error(`Workspace lifecycle request failed: ${response.status}`)
    }
    return (await response.json()) as TargetProductBootstrap
  })
  .then((bootstrap) => {
    createRoot(root).render(<WorkspaceLifecycleView bootstrap={bootstrap} />)
  })
