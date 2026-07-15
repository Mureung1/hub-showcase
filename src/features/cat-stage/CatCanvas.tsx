import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MathUtils, SRGBColorSpace, TextureLoader, type Group } from 'three'
import type { CatStageState } from './CatStage'

type CatCanvasProps = {
  assetSrc: string
  onReady: () => void
  state: CatStageState
}

type CatArtworkProps = CatCanvasProps

const motionByState: Record<
  CatStageState,
  { floatAmplitude: number; scale: number; speed: number; tilt: number }
> = {
  idle: { floatAmplitude: 0.035, scale: 0.94, speed: 0.9, tilt: -0.012 },
  selected: { floatAmplitude: 0.045, scale: 0.98, speed: 1.15, tilt: 0.018 },
  generating: { floatAmplitude: 0.055, scale: 0.96, speed: 1.9, tilt: -0.026 },
  result: { floatAmplitude: 0.04, scale: 1.02, speed: 1.3, tilt: 0.028 },
}

function CatArtwork({ assetSrc, onReady, state }: CatArtworkProps) {
  const artwork = useLoader(TextureLoader, assetSrc)
  const groupRef = useRef<Group>(null)
  const viewport = useThree((renderState) => renderState.viewport)
  const artworkSize = Math.min(viewport.width, viewport.height) * 0.92

  useEffect(() => {
    artwork.colorSpace = SRGBColorSpace
    artwork.needsUpdate = true
    onReady()
  }, [artwork, onReady])

  useFrame(({ clock }, delta) => {
    const group = groupRef.current
    if (!group) return

    const motion = motionByState[state]
    const phase = clock.elapsedTime * motion.speed
    const targetScale = artworkSize * motion.scale

    group.position.y = MathUtils.damp(
      group.position.y,
      Math.sin(phase) * artworkSize * motion.floatAmplitude,
      4,
      delta,
    )
    group.rotation.z = MathUtils.damp(
      group.rotation.z,
      motion.tilt + Math.sin(phase * 0.72) * 0.012,
      4,
      delta,
    )
    group.rotation.y = MathUtils.damp(group.rotation.y, Math.sin(phase * 0.55) * 0.035, 4, delta)
    group.scale.x = MathUtils.damp(group.scale.x, targetScale, 4, delta)
    group.scale.y = MathUtils.damp(group.scale.y, targetScale, 4, delta)
  })

  return (
    <>
      <mesh position={[0, -artworkSize * 0.43, -0.2]} scale={[artworkSize * 0.32, artworkSize * 0.055, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color="#6c8290" depthWrite={false} opacity={0.14} transparent />
      </mesh>
      <group ref={groupRef} scale={[artworkSize, artworkSize, 1]}>
        <mesh>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            alphaTest={0.02}
            depthWrite={false}
            map={artwork}
            toneMapped={false}
            transparent
          />
        </mesh>
      </group>
    </>
  )
}

function CatCanvas({ assetSrc, onReady, state }: CatCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], zoom: 100 }}
      className="cat-stage-canvas"
      dpr={[1, 1.5]}
      frameloop="always"
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      orthographic
    >
      <CatArtwork assetSrc={assetSrc} onReady={onReady} state={state} />
    </Canvas>
  )
}

export default CatCanvas
