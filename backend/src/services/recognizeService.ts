import { AppError } from '../middlewares/errorHandler'
import type { VisionImageInput } from '../types/visionApi'
import { findItemByName, getItemDisposalRule } from './itemService'
import { normalizeItemName } from './objectNormalizer'
import { getVisionApiClient } from './visionApiClient'

export async function recognizeItem(image: VisionImageInput) {
  const visionLabel = await getVisionApiClient().recognizeObject(image)
  if (!visionLabel) {
    throw new AppError('사진에서 물체를 인식하지 못했습니다', 404, { rawLabel: null })
  }

  const itemName = normalizeItemName(visionLabel)
  const item = itemName ? await findItemByName(itemName) : null
  if (!item) {
    throw new AppError('해당 물체와 일치하는 품목을 찾을 수 없습니다', 404, { rawLabel: visionLabel })
  }

  return getItemDisposalRule(item.id)
}
