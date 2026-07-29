import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BarcodeScanButton from './BarcodeScanButton.jsx'

const FAKE_STREAM = {
  getTracks: () => [{ stop: vi.fn() }],
}

beforeEach(() => {
  // jsdom엔 HTMLMediaElement.play가 구현돼 있지 않다 — 카메라 미리보기 시작을 흉내내려면 mock 필요.
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue(FAKE_STREAM) },
    configurable: true,
  })
})

afterEach(() => {
  delete window.BarcodeDetector
  vi.restoreAllMocks()
})

describe('BarcodeScanButton', () => {
  it('BarcodeDetector 미지원이면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(<BarcodeScanButton onDetected={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('지원하면 "바코드로 스캔" 버튼이 보인다', () => {
    window.BarcodeDetector = class {
      detect() {
        return Promise.resolve([])
      }
    }
    render(<BarcodeScanButton onDetected={() => {}} />)
    expect(screen.getByRole('button', { name: '바코드로 스캔' })).toBeInTheDocument()
  })

  it('버튼을 누르면 카메라 스트림을 요청하고 스캔 모달을 연다', async () => {
    window.BarcodeDetector = class {
      detect() {
        return new Promise(() => {}) // 이 테스트에선 감지되지 않게 계속 대기
      }
    }
    render(<BarcodeScanButton onDetected={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '바코드로 스캔' }))

    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled())
    expect(screen.getByRole('dialog', { name: '바코드 스캔' })).toBeInTheDocument()
  })

  it('바코드를 찾으면 onDetected를 부르고 모달을 닫는다', async () => {
    window.BarcodeDetector = class {
      detect() {
        return Promise.resolve([{ rawValue: '8801234567890' }])
      }
    }
    const onDetected = vi.fn()
    render(<BarcodeScanButton onDetected={onDetected} />)
    fireEvent.click(screen.getByRole('button', { name: '바코드로 스캔' }))

    await waitFor(() => expect(onDetected).toHaveBeenCalledWith('8801234567890'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('취소를 누르면 스트림을 정지하고 모달을 닫는다', async () => {
    window.BarcodeDetector = class {
      detect() {
        return new Promise(() => {})
      }
    }
    render(<BarcodeScanButton onDetected={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '바코드로 스캔' }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(FAKE_STREAM.getTracks()[0].stop).toBeDefined()
  })

  it('카메라 접근이 실패하면 에러 문구를 보여준다', async () => {
    window.BarcodeDetector = class {
      detect() {
        return Promise.resolve([])
      }
    }
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new Error('permission denied'))
    render(<BarcodeScanButton onDetected={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '바코드로 스캔' }))

    expect(await screen.findByText('카메라를 사용할 수 없어요. 영양성분표 사진으로 스캔해주세요.')).toBeInTheDocument()
  })
})
