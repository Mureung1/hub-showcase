import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CatStage } from './CatStage'

const catCanvasMock = vi.hoisted(() => ({ throws: false }))

vi.mock('./CatCanvas', async () => {
  const { useEffect } = await import('react')

  return {
    default: function MockCatCanvas({ onReady }: { onReady: () => void }) {
      if (catCanvasMock.throws) throw new Error('WebGL renderer failed')

      useEffect(() => onReady(), [onReady])
      return <canvas data-testid="cat-canvas" />
    },
  }
})

const mockMatchMedia = (reducedMotion: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

const enableWebGL = () => {
  vi.stubGlobal('WebGLRenderingContext', class WebGLRenderingContextMock {})
}

describe('CatStage', () => {
  beforeEach(() => {
    catCanvasMock.throws = false
    mockMatchMedia(false)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('WebGL을 사용할 수 없으면 같은 에셋의 정적 이미지만 보여준다', () => {
    const { container } = render(<CatStage assetSrc="/cats/dabnyangi-main.webp" state="idle" />)

    expect(container.querySelector('.cat-stage')).toHaveAttribute('data-renderer', 'static')
    expect(container.querySelector('.cat-stage')).toHaveAttribute('data-state', 'idle')
    expect(container.querySelector('.cat-stage-fallback')).toHaveAttribute('data-visible', 'true')
    expect(container.querySelector('.cat-stage-fallback')).toHaveAttribute('src', '/cats/dabnyangi-main.webp')
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('생성 상태에서는 생각하는 냥이 에셋으로 교체한다', () => {
    const { container, rerender } = render(
      <CatStage
        assetSrc="/cats/professor-cat-stage.webp"
        generatingAssetSrc="/cats/dabnyangi-thinking.webp"
        state="selected"
      />,
    )

    expect(container.querySelector('.cat-stage-fallback')).toHaveAttribute(
      'src',
      '/cats/professor-cat-stage.webp',
    )

    rerender(
      <CatStage
        assetSrc="/cats/professor-cat-stage.webp"
        generatingAssetSrc="/cats/dabnyangi-thinking.webp"
        state="generating"
      />,
    )

    expect(container.querySelector('.cat-stage-fallback')).toHaveAttribute(
      'src',
      '/cats/dabnyangi-thinking.webp',
    )
  })

  it('WebGL 환경에서는 지연 Canvas 하나가 준비된 뒤 정적 이미지를 숨긴다', async () => {
    enableWebGL()
    const { container } = render(<CatStage assetSrc="/cats/dabnyangi-main.webp" state="selected" />)

    await waitFor(() => expect(container.querySelector('.cat-stage')).toHaveAttribute('data-renderer', 'webgl'))
    expect(container.querySelectorAll('canvas')).toHaveLength(1)
    expect(container.querySelector('.cat-stage-fallback')).toHaveAttribute('data-visible', 'false')
    expect(container.querySelector('.cat-stage')).toHaveAttribute('data-state', 'selected')
  })

  it('모션 축소 설정에서는 WebGL이 있어도 Canvas를 만들지 않는다', () => {
    mockMatchMedia(true)
    enableWebGL()
    const { container } = render(<CatStage assetSrc="/cats/dabnyangi-main.webp" state="result" />)

    expect(container.querySelector('.cat-stage')).toHaveAttribute('data-renderer', 'static')
    expect(container.querySelector('.cat-stage-fallback')).toHaveAttribute('data-visible', 'true')
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('CPU 코어가 2개 이하인 저사양 환경에서는 정적 이미지만 보여준다', () => {
    vi.spyOn(window.navigator, 'hardwareConcurrency', 'get').mockReturnValue(2)
    enableWebGL()
    const { container } = render(<CatStage assetSrc="/cats/dabnyangi-main.webp" state="idle" />)

    expect(container.querySelector('.cat-stage')).toHaveAttribute('data-renderer', 'static')
    expect(container.querySelector('.cat-stage-fallback')).toHaveAttribute('data-visible', 'true')
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('정적 에셋 로드도 실패하면 깨진 이미지 대신 냥 배지를 보여준다', () => {
    const { container } = render(<CatStage assetSrc="/cats/missing.webp" state="idle" />)

    fireEvent.error(container.querySelector('.cat-stage-fallback') as HTMLImageElement)

    expect(container.querySelector('.cat-stage')).toHaveAttribute('data-renderer', 'badge')
    expect(container.querySelector('.cat-stage-fallback')).toHaveAttribute('data-visible', 'false')
    expect(container.querySelector('.cat-stage-badge')).toHaveTextContent('냥')
  })

  it('WebGL 컨텍스트가 손실되면 정적 이미지로 복귀한다', async () => {
    enableWebGL()
    const { container } = render(<CatStage assetSrc="/cats/dabnyangi-main.webp" state="idle" />)

    await waitFor(() => expect(container.querySelector('.cat-stage')).toHaveAttribute('data-renderer', 'webgl'))

    fireEvent(
      container.querySelector('canvas') as HTMLCanvasElement,
      new Event('webglcontextlost', { cancelable: true }),
    )

    expect(container.querySelector('.cat-stage')).toHaveAttribute('data-renderer', 'fallback')
    expect(container.querySelector('.cat-stage-fallback')).toHaveAttribute('data-visible', 'true')
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('Canvas 렌더 오류가 나면 정적 이미지로 복귀한다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    catCanvasMock.throws = true
    enableWebGL()
    const { container } = render(<CatStage assetSrc="/cats/dabnyangi-main.webp" state="generating" />)

    await waitFor(() => expect(container.querySelector('.cat-stage')).toHaveAttribute('data-renderer', 'fallback'))
    expect(container.querySelector('.cat-stage-fallback')).toHaveAttribute('data-visible', 'true')
    expect(container.querySelector('canvas')).toBeNull()
  })
})
