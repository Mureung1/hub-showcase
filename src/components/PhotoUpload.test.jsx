// 사진 입력 경로 — 카메라/갤러리 선택.
//
// 안드로이드 웹뷰(Capacitor)의 파일 피커에는 카메라 항목이 **없다**(BridgeWebChromeClient의
// showFilePicker는 ACTION_GET_CONTENT만 띄운다). 대신 `capture` 속성이 붙은 input은
// isCaptureEnabled()로 갈려 ACTION_IMAGE_CAPTURE(카메라)로 간다. 그래서 앱에서만 자체 선택 시트를
// 띄우고, 고른 쪽에 맞는 input을 누른다.
//
// 여기서 고정하는 것: ① 앱에서는 시트가 뜨고 선택에 맞는 input이 눌린다 ② 웹에서는 시트 없이
// 바로 갤러리 input이 눌린다(모바일 브라우저는 OS가 이미 선택지를 주므로 탭을 늘리면 안 된다)
// ③ 두 input의 capture 속성이 서로 다르다(이게 갈라지면 앱에서 두 선택지가 같은 동작을 한다).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PhotoUpload from './PhotoUpload.jsx'

const isApkMock = vi.fn()
vi.mock('../utils/platform.js', () => ({
  isApk: () => isApkMock(),
  isBrowser: () => !isApkMock(),
  getPlatform: () => (isApkMock() ? 'apk' : 'web'),
  PLATFORM: { WEB: 'web', MOBILE_WEB: 'mobile-web', APK: 'apk' },
}))

// 숨은 input의 click을 가로채 "어느 쪽이 눌렸는지"만 본다 — jsdom은 파일 선택창을 띄우지 않는다.
function spyOnInputs() {
  const camera = screen.getByTestId('photo-input-camera')
  const gallery = screen.getByTestId('photo-input-gallery')
  const cameraClick = vi.fn()
  const galleryClick = vi.fn()
  camera.click = cameraClick
  gallery.click = galleryClick
  return { camera, gallery, cameraClick, galleryClick }
}

// 사진 영역(role="button")을 누른다 — 시트 안 버튼들과 섞이지 않게 첫 번째를 잡는다.
function tapPhotoArea() {
  fireEvent.click(screen.getAllByRole('button')[0])
}

beforeEach(() => {
  isApkMock.mockReset()
})

describe('PhotoUpload — 사진 출처 선택', () => {
  it('두 input은 capture 속성으로만 갈린다(카메라 O / 갤러리 X)', () => {
    isApkMock.mockReturnValue(false)
    render(<PhotoUpload onChange={() => {}} />)
    const { camera, gallery } = spyOnInputs()

    expect(camera).toHaveAttribute('capture', 'environment')
    expect(gallery).not.toHaveAttribute('capture')
    expect(camera).toHaveAttribute('accept', 'image/*')
    expect(gallery).toHaveAttribute('accept', 'image/*')
  })

  it('웹에서는 선택 시트 없이 바로 갤러리 input이 열린다', () => {
    isApkMock.mockReturnValue(false)
    render(<PhotoUpload onChange={() => {}} />)
    const { cameraClick, galleryClick } = spyOnInputs()

    tapPhotoArea()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(galleryClick).toHaveBeenCalledTimes(1)
    expect(cameraClick).not.toHaveBeenCalled()
  })

  it('앱에서는 카메라/갤러리 선택 시트가 뜬다', () => {
    isApkMock.mockReturnValue(true)
    render(<PhotoUpload onChange={() => {}} />)
    const { cameraClick, galleryClick } = spyOnInputs()

    tapPhotoArea()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /카메라로 촬영/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /갤러리에서 선택/ })).toBeInTheDocument()
    // 시트가 뜬 것만으로는 아직 아무 input도 열리면 안 된다.
    expect(cameraClick).not.toHaveBeenCalled()
    expect(galleryClick).not.toHaveBeenCalled()
  })

  it('앱에서 "카메라로 촬영"을 고르면 capture input이 열린다', async () => {
    isApkMock.mockReturnValue(true)
    render(<PhotoUpload onChange={() => {}} />)
    const { cameraClick, galleryClick } = spyOnInputs()

    tapPhotoArea()
    fireEvent.click(screen.getByRole('button', { name: /카메라로 촬영/ }))

    await waitFor(() => expect(cameraClick).toHaveBeenCalledTimes(1))
    expect(galleryClick).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('앱에서 "갤러리에서 선택"을 고르면 capture 없는 input이 열린다', async () => {
    isApkMock.mockReturnValue(true)
    render(<PhotoUpload onChange={() => {}} />)
    const { cameraClick, galleryClick } = spyOnInputs()

    tapPhotoArea()
    fireEvent.click(screen.getByRole('button', { name: /갤러리에서 선택/ }))

    await waitFor(() => expect(galleryClick).toHaveBeenCalledTimes(1))
    expect(cameraClick).not.toHaveBeenCalled()
  })

  it('취소하면 아무 input도 열지 않고 시트만 닫힌다', async () => {
    isApkMock.mockReturnValue(true)
    render(<PhotoUpload onChange={() => {}} />)
    const { cameraClick, galleryClick } = spyOnInputs()

    tapPhotoArea()
    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // setTimeout(0)으로 미룬 click이 뒤늦게 들어오지 않는지까지 확인한다.
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(cameraClick).not.toHaveBeenCalled()
    expect(galleryClick).not.toHaveBeenCalled()
  })
})
