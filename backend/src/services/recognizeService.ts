import { AppError } from '../middlewares/errorHandler'
import type { VisionImageInput } from '../types/visionApi'
import { findBestMatchingItem, getItemDisposalRule } from './itemService'
import { getVisionApiClient } from './visionApiClient'

export async function recognizeItem(image: VisionImageInput) {
  const visionLabel = await getVisionApiClient().recognizeObject(image)
  if (!visionLabel) {
    throw new AppError('사진에서 물체를 인식하지 못했습니다', 404, { rawLabel: null })
  }

  const item = await findBestMatchingItem(visionLabel)
  if (!item) {
    throw new AppError('해당 물체와 일치하는 품목을 찾을 수 없습니다', 404, { rawLabel: visionLabel })
  }

  return getItemDisposalRule(item.id)
}
