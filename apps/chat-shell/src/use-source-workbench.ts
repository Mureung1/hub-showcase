import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  activateProductWorkspace,
  createProductCourse,
  fetchProductBootstrap,
  fetchSettledProductBootstrap,
  fetchProductMaterialPreview,
  ProductApiError,
  refreshProductMaterials,
  type ProductBootstrap,
  type ProductSettledHistory,
  type ProductMaterialPreview,
  type ProductMaterialRefreshResponse,
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

export type ProductEvidenceFocus = {
  readonly materialId: string
  readonly digest: string
  readonly quote: string
}

type ProductBootstrapView =
  | { readonly state: 'loading' }
  | { readonly state: 'loaded'; readonly bootstrap: ProductBootstrap }
  | { readonly state: 'error'; readonly displayMessage: string }

export function useSourceWorkbench() {
  const bootstrapReadGeneration = useRef(0)
  const [bootstrapView, setBootstrapView] = useState<ProductBootstrapView>({
    state: 'loading',
  })
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<
    readonly string[]
  >([])
  const [activeMaterialId, setActiveMaterialId] = useState<string>()
  const [previewView, setPreviewView] = useState<ProductPreviewView>({
    state: 'idle',
  })
  const [evidenceFocus, setEvidenceFocus] = useState<ProductEvidenceFocus>()
  const [mutationPending, setMutationPending] = useState(false)
  const [bootstrapRefreshing, setBootstrapRefreshing] = useState(false)
  const [operationFailure, setOperationFailure] = useState<string>()
  const [materialRefreshOutcome, setMaterialRefreshOutcome] = useState<
    ProductMaterialRefreshResponse['outcome']
  >()

  const loadWorkspace = useCallback(async (signal?: AbortSignal) => {
    const readGeneration = ++bootstrapReadGeneration.current
    setOperationFailure(undefined)
    setMaterialRefreshOutcome(undefined)
    setBootstrapRefreshing(false)
    setBootstrapView({ state: 'loading' })
    try {
      const bootstrap = await fetchSettledProductBootstrap(signal)
      if (bootstrapReadGeneration.current === readGeneration) {
        setBootstrapView({ state: 'loaded', bootstrap })
      }
    } catch (error) {
      if (
        !signal?.aborted &&
        bootstrapReadGeneration.current === readGeneration
      ) {
        setBootstrapView({
          state: 'error',
          displayMessage: safeMessage(error),
        })
      }
    }
  }, [])

  const refreshBootstrapView = useCallback(
    async (
      readBootstrap: ProductBootstrapReader,
      signal?: AbortSignal,
    ) => {
      const readGeneration = ++bootstrapReadGeneration.current
      setOperationFailure(undefined)
      setMaterialRefreshOutcome(undefined)
      setBootstrapRefreshing(true)
      try {
        const bootstrap = await readBootstrap(signal)
        if (bootstrapReadGeneration.current === readGeneration) {
          setBootstrapView({ state: 'loaded', bootstrap })
        }
        return bootstrap
      } catch (error) {
        if (
          !signal?.aborted &&
          bootstrapReadGeneration.current === readGeneration
        ) {
          setOperationFailure(safeMessage(error))
        }
        throw error
      } finally {
        if (
          !signal?.aborted &&
          bootstrapReadGeneration.current === readGeneration
        ) {
          setBootstrapRefreshing(false)
        }
      }
    },
    [],
  )

  const refreshProductSnapshot = useCallback(
    (signal?: AbortSignal) =>
      refreshBootstrapView(fetchProductBootstrap, signal),
    [refreshBootstrapView],
  )

  const refreshSettledProductState = useCallback(
    (signal?: AbortSignal) =>
      refreshBootstrapView(fetchSettledProductBootstrap, signal),
    [refreshBootstrapView],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadWorkspace(controller.signal)
    return () => controller.abort()
  }, [loadWorkspace])

  const bootstrap =
    bootstrapView.state === 'loaded' ? bootstrapView.bootstrap : undefined
  const workspaceView: ProductWorkspaceView =
    bootstrapView.state === 'loading'
      ? { state: 'loading' }
      : bootstrapView.state === 'error'
        ? bootstrapView
        : { state: 'loaded', workspace: bootstrapView.bootstrap.workspace }
  const readyWorkspace =
    bootstrap?.workspace?.state === 'ready'
      ? bootstrap.workspace
      : undefined
  const accountReadiness = bootstrap?.accountReadiness
  const history = bootstrap?.history

  useEffect(() => {
    if (!readyWorkspace) {
      setSelectedMaterialIds([])
      setActiveMaterialId(undefined)
      setEvidenceFocus(undefined)
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
    setEvidenceFocus((current) =>
      current &&
      readyWorkspace.materials.some(
        (material) =>
          material.id === current.materialId &&
          material.digest === current.digest,
      )
        ? current
        : undefined,
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
    setBootstrapView((current) => {
      if (current.state !== 'loaded') return current
      return {
        state: 'loaded',
        bootstrap: {
          ...current.bootstrap,
          workspace,
        },
      }
    })
  }

  async function runWorkspaceMutation(operation: () => Promise<void>) {
    if (mutationPending) return
    setOperationFailure(undefined)
    setMutationPending(true)
    try {
      await operation()
    } catch (error) {
      const displayMessage = safeMessage(error)
      try {
        await refreshSettledProductState()
      } catch {
        // Keep the original mutation failure when recovery hydration also fails.
      }
      setOperationFailure(displayMessage)
    } finally {
      setMutationPending(false)
    }
  }

  async function activateWorkspace() {
    await runWorkspaceMutation(async () => {
      setMaterialRefreshOutcome(undefined)
      const activation = await activateProductWorkspace()
      if (activation.status === 'cancelled') return
      setBootstrapView((current) =>
        current.state === 'loaded'
          ? {
              state: 'loaded',
              bootstrap: {
                ...current.bootstrap,
                workspace: activation.workspace,
                history: emptyHistory(),
              },
            }
          : current,
      )
      await refreshSettledProductState()
    })
  }

  async function createCourse(displayName: string) {
    await runWorkspaceMutation(async () => {
      setMaterialRefreshOutcome(undefined)
      commitReadyWorkspace(await createProductCourse(displayName))
      await refreshSettledProductState()
    })
  }

  async function refreshMaterials() {
    if (!readyWorkspace) return
    await runWorkspaceMutation(async () => {
      setMaterialRefreshOutcome(undefined)
      const refreshed = await refreshProductMaterials()
      commitReadyWorkspace(refreshed.workspace)
      await refreshSettledProductState()
      setMaterialRefreshOutcome(refreshed.outcome)
    })
  }

  function toggleMaterial(materialId: string) {
    if (!readyWorkspace) return
    setSelectedMaterialIds((current) => {
      if (current.includes(materialId)) {
        const next = current.filter((candidate) => candidate !== materialId)
        if (activeMaterialId === materialId) setActiveMaterialId(next[0])
        if (evidenceFocus?.materialId === materialId) {
          setEvidenceFocus(undefined)
        }
        return next
      }
      if (current.length >= 2) return current
      const next = [...current, materialId]
      if (activeMaterialId === undefined) setActiveMaterialId(materialId)
      return next
    })
  }

  function selectMaterialTab(materialId: string) {
    if (!selectedMaterialIds.includes(materialId)) return
    setEvidenceFocus(undefined)
    setActiveMaterialId(materialId)
  }

  function navigateToEvidence(focus: ProductEvidenceFocus) {
    const material = readyWorkspace?.materials.find(
      (candidate) =>
        candidate.id === focus.materialId && candidate.digest === focus.digest,
    )
    if (!material || !focus.quote) return
    setSelectedMaterialIds((current) =>
      current.includes(material.id)
        ? current
        : [...current.slice(0, 1), material.id],
    )
    setActiveMaterialId(material.id)
    setEvidenceFocus({ ...focus })
  }

  return {
    bootstrap,
    accountReadiness,
    history,
    workspaceView,
    readyWorkspace,
    selectedMaterialIds,
    selectedMaterials,
    activeMaterialId: activeMaterial?.id,
    previewView,
    evidenceFocus,
    mutationPending,
    bootstrapRefreshing,
    operationFailure,
    materialRefreshOutcome,
    loadWorkspace,
    refreshProductSnapshot,
    refreshSettledProductState,
    activateWorkspace,
    createCourse,
    refreshMaterials,
    toggleMaterial,
    selectMaterialTab,
    navigateToEvidence,
  }
}

type ProductBootstrapReader = (
  signal?: AbortSignal,
) => Promise<ProductBootstrap>

function emptyHistory(): ProductSettledHistory {
  return {
    assignments: [],
    statePatches: [],
    userConfirmations: [],
    modelingRuns: [],
  }
}

function safeMessage(error: unknown): string {
  return error instanceof ProductApiError
    ? error.displayMessage
    : '학기 작업공간 요청을 완료하지 못했습니다.'
}
