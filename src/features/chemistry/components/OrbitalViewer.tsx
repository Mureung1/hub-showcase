import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export type OrbitalMode = 's' | 'px' | 'py' | 'pz' | 'h2'

const WIDTH = 380
const HEIGHT = 300
const BG_COLOR = 0x18181b

// 앱 시맨틱 팔레트 재사용 (index.css --color-accent/--color-compare/--color-secondary-accent)
const AXIS_COLORS = { x: 0x22d3ee, y: 0xf7931a, z: 0x6366f1 }

function makeTextSprite(text: string, color: string, scale = 0.5) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.font = 'bold 92px system-ui, sans-serif'
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 70)
  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(scale, scale, 1)
  return sprite
}

/**
 * p 오비탈 로브 한 쌍(양/음 로브)을 Y축 방향으로 만든다. 두 로브는 원점(마디, node)에서
 * 반지름이 0으로 좁아져 서로 닿기만 하고 겹치지 않는다 — 실제 p 오비탈의 핵심 특징.
 */
function createPOrbitalLobePair(color: number) {
  const profile = [
    new THREE.Vector2(0.0001, 0),
    new THREE.Vector2(0.42, 0.28),
    new THREE.Vector2(0.58, 0.55),
    new THREE.Vector2(0.5, 0.8),
    new THREE.Vector2(0.24, 0.98),
    new THREE.Vector2(0.0001, 1.05),
  ]
  const material = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    roughness: 0.45,
  })

  const positiveLobe = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), material)
  const negativeLobe = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), material)
  negativeLobe.scale.y = -1

  const group = new THREE.Group()
  group.add(positiveLobe, negativeLobe)
  return group
}

function buildSScene(scene: THREE.Scene) {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.3, 32, 32),
    new THREE.MeshStandardMaterial({
      color: AXIS_COLORS.x,
      transparent: true,
      opacity: 0.5,
      roughness: 0.45,
    }),
  )
  scene.add(sphere)
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshBasicMaterial({ color: 0xf5f6f8 })))
}

/**
 * p 오비탈은 한 번에 하나의 로브 쌍(px/py/pz 중 하나)만 실제로 그린다. px/py/pz를
 * 동시에 겹쳐 그리면 서로 다른 오비탈이 원점의 마디 자리를 채워버려, 정작 이 화면이
 * 보여주려는 "핵을 지나는 지점에서 확률이 0"이라는 마디가 화면에서 사라져버린다
 * (사후 검증에서 실제 렌더링 픽셀로 확인된 문제). 대신 나머지 두 축은 부피가 없는
 * 가는 기준선으로만 표시해 "서로 수직" 관계는 유지하면서 마디를 가리지 않는다.
 */
function buildPScene(scene: THREE.Scene, axis: 'x' | 'y' | 'z') {
  const lobe = createPOrbitalLobePair(AXIS_COLORS[axis])
  if (axis === 'x') lobe.rotation.z = -Math.PI / 2
  else if (axis === 'z') lobe.rotation.x = Math.PI / 2
  scene.add(lobe)

  const axisLength = 1.8
  ;(
    [
      ['x', AXIS_COLORS.x, new THREE.Vector3(axisLength, 0, 0), '#22d3ee'],
      ['y', AXIS_COLORS.y, new THREE.Vector3(0, axisLength, 0), '#fbc978'],
      ['z', AXIS_COLORS.z, new THREE.Vector3(0, 0, axisLength), '#a5b4fc'],
    ] as const
  ).forEach(([axisName, color, pos, hex]) => {
    const points = [pos.clone().multiplyScalar(-1), pos.clone()]
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)
    const lineMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: axisName === axis ? 0 : 0.35, // 현재 로브가 있는 축은 선을 숨겨 로브와 안 겹치게 함
    })
    scene.add(new THREE.Line(lineGeometry, lineMaterial))

    const sprite = makeTextSprite(axisName, hex)
    sprite.position.copy(pos)
    scene.add(sprite)
  })

  scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshBasicMaterial({ color: 0xf5f6f8 })))
}

function buildH2Scene(scene: THREE.Scene) {
  const material = new THREE.MeshStandardMaterial({
    color: AXIS_COLORS.x,
    transparent: true,
    opacity: 0.5,
    roughness: 0.45,
  })
  const geometry = new THREE.SphereGeometry(1.0, 32, 32)
  const nucleusGeometry = new THREE.SphereGeometry(0.09, 12, 12)
  const nucleusMaterial = new THREE.MeshBasicMaterial({ color: 0xf5f6f8 })

  ;[-0.65, 0.65].forEach((x) => {
    const orbital = new THREE.Mesh(geometry, material)
    orbital.position.x = x
    scene.add(orbital)
    const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial)
    nucleus.position.x = x
    scene.add(nucleus)
    const label = makeTextSprite('H', '#f5f6f8', 0.35)
    label.position.set(x, 1.3, 0)
    scene.add(label)
  })
}

export default function OrbitalViewer({ mode }: { mode: OrbitalMode }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 100)
    // 3/4 각도 기본 시점 — p 오비탈을 축 방향 정면(로브가 점으로 겹쳐 보이는 각도)에서
    // 보면 s 오비탈 구와 구분이 안 되므로, 두 로브가 모두 보이는 각도를 기본값으로 둔다.
    camera.position.set(3.2, 2.4, 3.8)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(WIDTH, HEIGHT)
    renderer.setClearColor(BG_COLOR, 1)
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const directional = new THREE.DirectionalLight(0xffffff, 0.8)
    directional.position.set(4, 5, 3)
    scene.add(directional)

    if (mode === 's') buildSScene(scene)
    else if (mode === 'h2') buildH2Scene(scene)
    else buildPScene(scene, mode === 'px' ? 'x' : mode === 'py' ? 'y' : 'z')

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08

    let frameId: number
    const animate = () => {
      controls.update()
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameId)
      controls.dispose()
      renderer.dispose()
      container.innerHTML = ''
    }
  }, [mode])

  return (
    <div className="relative h-[300px] w-[380px]">
      <div ref={containerRef} className="h-full w-full rounded-lg bg-zinc-950" />
    </div>
  )
}
