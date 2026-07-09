import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

type VideoCapturePickerProps = {
  onVideoReady: (videoUrl: string) => void
}

const MAX_DURATION_SECONDS = 5

export function VideoCapturePicker({ onVideoReady }: VideoCapturePickerProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream
    }
  }, [stream])

  const stopRecording = () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  const beginRecording = () => {
    if (!stream) return

    chunksRef.current = []
    const recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      onVideoReady(URL.createObjectURL(blob))
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    mediaRecorderRef.current = recorder
    recorder.start()
    autoStopTimerRef.current = setTimeout(stopRecording, MAX_DURATION_SECONDS * 1000)
  }

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      window.alert('영상을 촬영할 기기를 찾지 못했습니다.')
      return
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(mediaStream)
    } catch {
      window.alert('영상을 촬영할 기기를 찾지 못했습니다.')
    }
  }

  const closeModal = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      stopRecording()
      return
    }

    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current)
      autoStopTimerRef.current = null
    }
    stream?.getTracks().forEach((track) => track.stop())
    setStream(null)
  }

  const handleFilePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    const probe = document.createElement('video')
    probe.preload = 'metadata'
    probe.onloadedmetadata = () => {
      if (probe.duration > MAX_DURATION_SECONDS) {
        window.alert(`영상은 ${MAX_DURATION_SECONDS}초 이내로만 올릴 수 있어요.`)
        URL.revokeObjectURL(url)
      } else {
        onVideoReady(url)
      }
    }
    probe.src = url
    event.target.value = ''
  }

  return (
    <>
      <div className="capture-buttons">
        <button type="button" className="feed-upload-button" onClick={openCamera}>
          촬영하기
        </button>
        <button type="button" className="feed-upload-button secondary" onClick={() => fileInputRef.current?.click()}>
          파일 선택하기
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="feed-upload-input"
        onChange={handleFilePicked}
      />

      {stream && (
        <div className="record-overlay" role="dialog" aria-modal="true" aria-label="영상 촬영">
          <div className="record-modal">
            <button type="button" className="record-close-button" aria-label="닫기" onClick={closeModal}>
              ×
            </button>
            <video ref={videoPreviewRef} className="record-preview" autoPlay muted playsInline />
            <button type="button" className="record-stop-button" onClick={beginRecording}>
              촬영 시작
            </button>
          </div>
        </div>
      )}
    </>
  )
}
