import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  activateProductWorkspace,
  createProductCourse,
  fetchProductBootstrap,
  fetchProductMaterialPreview,
  ProductApiError,
  refreshProductMaterials,
  type ProductMaterialPreview,
  type ProductRawMaterial,
  type ProductWorkspace,
  type ReadyProductWorkspace,
} from './product-api.js'

export type ProductWorkspaceView =
  | { readonly state: 'loading' }
  | { readonly state: 'loaded'; readonly workspace: ProductWorkspace | null }
  | { readonly state: 'error'; readonly displayMessage: string }

export type ProductPreviewView =
  | { readonly state: 'idle' }
  | { readonly state: 'loading'; readonly material: ProductRawMaterial }
  | {
      readonly state: 'loaded'
      readonly material: ProductRawMaterial
      readonly preview: ProductMaterialPreview
    }
  | {
      readonly state: 'error'
      readonly material: ProductRawMaterial
      readonly displayMessage: string
    }

export function useSourceWorkbench() {
  const [workspaceView, setWorkspaceView] = useState<ProductWorkspaceView>({
    state: 'loading',
  })
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<
    readonly string[]
  >([])
  const [activeMaterialId, setActiveMaterialId] = useState<string>()
  const [previewView, setPreviewView] = useState<ProductPreviewView>({
    state: 'idle',
  })
  const [mutationPending, setMutationPending] = useState(false)
  const [operationFailure, setOperationFailure] = useState<string>()

  const loadWorkspace = useCallback(async (signal?: AbortSignal) => {
    setOperationFailure(undefined)
    setWorkspaceView({ state: 'loading' })
    try {
      const bootstrap = await fetchProductBootstrap(signal)
      setWorkspaceView({ state: 'loaded', workspace: bootstrap.workspace })
    } catch (error) {
      if (!signal?.aborted) {
        setWorkspaceView({
          state: 'error',
          displayMessage: safeMessage(error),
        })
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadWorkspace(controller.signal)
    return () => controller.abort()
  }, [loadWorkspace])

  const readyWorkspace =
    workspaceView.state === 'loaded' &&
    workspaceView.workspace?.state === 'ready'
      ? workspaceView.workspace
      : undefined

  useEffect(() => {
    if (!readyWorkspace) {
      setSelectedMaterialIds([])
      setActiveMaterialId(undefined)
      return
    }
    const available = new Set(
      readyWorkspace.materials.map((material) => material.id),
    )
    setSelectedMaterialIds((current) =>
      current.filter((materialId) => available.has(materialId)).slice(0, 2),
    )
    setActiveMaterialId((current) =>
      current && available.has(current) ? current : undefined,
    )
  }, [readyWorkspace])

  const selectedMaterials = useMemo(
    () =>
      selectedMaterialIds
        .map((materialId) =>
          readyWorkspace?.materials.find(
            (material) => material.id === materialId,
          ),
        )
        .filter((material): material is ProductRawMaterial => material !== undefined),
    [readyWorkspace, selectedMaterialIds],
  )
  const activeMaterial =
    selectedMaterials.find((material) => material.id === activeMaterialId) ??
    selectedMaterials[0]

  useEffect(() => {
    if (!activeMaterial) {
      setPreviewView({ state: 'idle' })
      return
    }
    if (activeMaterial.id !== activeMaterialId) {
      setActiveMaterialId(activeMaterial.id)
    }
    const controller = new AbortController()
    setPreviewView({ state: 'loading', material: activeMaterial })
    void fetchProductMaterialPreview(activeMaterial, controller.signal).then(
      (preview) =>
        setPreviewView({ state: 'loaded', material: activeMaterial, preview }),
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setPreviewView({
            state: 'error',
            material: activeMaterial,
            displayMessage: safeMessage(error),
          })
        }
      },
    )
    return () => controller.abort()
  }, [activeMaterial, activeMaterialId])

  const commitReadyWorkspace = (workspace: ReadyProductWorkspace) => {
    setWorkspaceView({ state: 'loaded', workspace })
  }

  async function runWorkspaceMutation(operation: () => Promise<void>) {
    if (mutationPending) return
    setOperationFailure(undefined)
    setMutationPending(true)
    try {
      await operation()
    } catch (error) {
      setOperationFailure(safeMessage(error))
    } finally {
      setMutationPending(false)
    }
  }

  async function activateWorkspace() {
    await runWorkspaceMutation(async () => {
      const workspace = await activateProductWorkspace()
      setWorkspaceView({ state: 'loaded', workspace })
    })
  }

  async function createCourse(displayName: string) {
    await runWorkspaceMutation(async () => {
      commitReadyWorkspace(await createProductCourse(displayName))
    })
  }

  async function refreshMaterials() {
    if (!readyWorkspace) return
    await runWorkspaceMutation(async () => {
      commitReadyWorkspace(await refreshProductMaterials())
    })
  }

  function toggleMaterial(materialId: string) {
    if (!readyWorkspace) return
    setSelectedMaterialIds((current) => {
      if (current.includes(materialId)) {
        const next = current.filter((candidate) => candidate !== materialId)
        if (activeMaterialId === materialId) setActiveMaterialId(next[0])
        return next
      }
      if (current.length >= 2) return current
      const next = [...current, materialId]
      if (activeMaterialId === undefined) setActiveMaterialId(materialId)
      return next
    })
  }

  return {
    workspaceView,
    readyWorkspace,
    selectedMaterialIds,
    selectedMaterials,
    activeMaterialId: activeMaterial?.id,
    previewView,
    mutationPending,
    operationFailure,
    loadWorkspace,
    activateWorkspace,
    createCourse,
    refreshMaterials,
    toggleMaterial,
    setActiveMaterialId,
  }
}

function safeMessage(error: unknown): string {
  return error instanceof ProductApiError
    ? error.displayMessage
    : '학기 작업공간 요청을 완료하지 못했습니다.'
}
