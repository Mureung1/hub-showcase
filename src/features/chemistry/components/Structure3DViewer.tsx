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
      // 기본 카메라가 z축 정면에서 바라보면, z축 위에 놓인 원자가 시선과
      // 겹쳐서 안 보이는 축이 생긴다(예: 정팔면체가 평면사각형처럼 보임).
      // 특정 축과 절대 안 겹치도록 살짝 기울여서 기본 시점을 잡는다.
      viewer.rotate(25, 'x')
      viewer.rotate(35, 'y')
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
