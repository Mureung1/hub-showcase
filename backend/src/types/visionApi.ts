// Vision AI(OpenAI Vision API) 연동 관련 타입
// Confidence Score는 사용하지 않는다 — Top Prediction 1개만 반환 (README/TASK.md 참고)

export interface VisionImageInput {
  buffer: Buffer
  mimeType: string
}

export interface VisionApiClient {
  recognizeObject(image: VisionImageInput): Promise<string | null>
}
