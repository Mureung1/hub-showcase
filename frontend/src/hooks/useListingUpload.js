import { useEffect, useState } from 'react'
import { createWorker } from 'tesseract.js'
import { defaultListingFields, loadListingInfo, saveListingInfoToStorage } from '../utils/listingStorage'
import { parseListingFieldsFromText } from '../utils/listingTextParser'

const acceptedImageTypes = ['image/png', 'image/jpeg', 'image/webp']

function createInitialState() {
  const saved = loadListingInfo()

  return {
    fields: saved?.fields ? { ...defaultListingFields, ...saved.fields } : defaultListingFields,
    imageName: saved?.imageName || '',
    imageType: saved?.imageType || '',
    ocrText: saved?.ocrText || '',
    restored: Boolean(saved),
    savedAt: saved?.savedAt || '',
  }
}

export function useListingUpload() {
  const [initialState] = useState(createInitialState)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [ocrText, setOcrText] = useState(initialState.ocrText)
  const [fields, setFields] = useState(initialState.fields)
  const [imageName, setImageName] = useState(initialState.imageName)
  const [imageType, setImageType] = useState(initialState.imageType)
  const [savedAt, setSavedAt] = useState(initialState.savedAt)
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const [saved, setSaved] = useState(initialState.restored)

  useEffect(() => {
    if (!file) {
      return undefined
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  function selectFile(nextFile) {
    setError('')
    setSaved(false)

    if (!nextFile) {
      return
    }

    if (!acceptedImageTypes.includes(nextFile.type)) {
      setError('PNG, JPG, WEBP 형식의 이미지 파일만 업로드할 수 있습니다.')
      return
    }

    setFile(nextFile)
    setImageName(nextFile.name)
    setImageType(nextFile.type)
    setOcrText('')
    setFields(defaultListingFields)
    setSavedAt('')
  }

  function updateField(name, value) {
    setFields((prevFields) => ({ ...prevFields, [name]: value }))
    setSaved(false)
  }

  async function runOcr() {
    if (!file) {
      setError('OCR 분석을 실행할 이미지를 먼저 업로드해주세요.')
      return
    }

    setError('')
    setIsProcessing(true)
    setProgressMessage('OCR 엔진을 준비하고 있습니다.')

    let worker
    try {
      worker = await createWorker('kor+eng', 1, {
        logger: (message) => {
          if (message.status) {
            const progress = Math.round((message.progress || 0) * 100)
            setProgressMessage(`${message.status}${progress ? ` ${progress}%` : ''}`)
          }
        },
      })
      const result = await worker.recognize(file)
      const text = result.data.text.trim()

      setOcrText(text)
      setFields((prevFields) => ({
        ...prevFields,
        ...parseListingFieldsFromText(text),
      }))
      setProgressMessage('')
    } catch {
      setError('OCR 분석에 실패했습니다. 이미지가 선명한지 확인한 뒤 다시 시도해주세요.')
    } finally {
      if (worker) {
        await worker.terminate()
      }
      setIsProcessing(false)
    }
  }

  function saveListingInfo() {
    const hasFieldValue = Object.values(fields).some((value) => String(value).trim())
    if (!ocrText && !hasFieldValue) {
      setError('저장할 OCR 결과나 매물 정보를 먼저 입력해주세요.')
      return
    }

    const data = saveListingInfoToStorage({
      fields,
      imageName,
      imageType,
      ocrText,
    })

    setSavedAt(data.savedAt)
    setSaved(true)
    setError('')
  }

  return {
    error,
    fields,
    imageName,
    isProcessing,
    ocrText,
    previewUrl,
    progressMessage,
    runOcr,
    saved,
    savedAt,
    selectFile,
    updateField,
    saveListingInfo,
  }
}
