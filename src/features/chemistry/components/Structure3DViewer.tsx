import { useEffect, useRef } from 'react'
import * as $3Dmol from '3dmol'

interface Structure3DViewerProps {
  sdf: string | null
}

export default function Structure3DViewer({ sdf }: Structure3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<ReturnType<typeof $3Dmol.createViewer> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    viewerRef.current = $3Dmol.createViewer(container, {
      backgroundColor: '#18181b',
    })

    return () => {
      // 3Dmol has no dispose() API — dropping its canvas node is what
      // actually releases the WebGL context. Without this, StrictMode's
      // mount->cleanup->mount (and route re-entry) stacks a second canvas
      // on top of the first instead of replacing it.
      container.innerHTML = ''
      viewerRef.current = null
    }
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.clear()
    if (sdf) {
      viewer.addModel(sdf, 'sdf')
      viewer.setStyle({ stick: {} })
      viewer.zoomTo()
      viewer.render()
    }
  }, [sdf])

  return (
    <div className="relative h-[300px] w-[380px]">
      <div ref={containerRef} className="h-full w-full rounded-lg bg-zinc-950" />
      {!sdf && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-zinc-500">
          3D 구조를 찾을 수 없습니다 (PubChem에 등록되지 않은 분자)
        </div>
      )}
    </div>
  )
}
