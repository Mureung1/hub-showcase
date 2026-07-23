import { PROJECT_ICON } from '@teamflow/shared'
import BookOpen from 'lucide-react/dist/esm/icons/book-open.mjs'
import Code2 from 'lucide-react/dist/esm/icons/code-2.mjs'
import Layers3 from 'lucide-react/dist/esm/icons/layers-3.mjs'
import Megaphone from 'lucide-react/dist/esm/icons/megaphone.mjs'
import Palette from 'lucide-react/dist/esm/icons/palette.mjs'
import Rocket from 'lucide-react/dist/esm/icons/rocket.mjs'

const ICON_COMPONENT = Object.freeze({
  [PROJECT_ICON.LAYERS]: Layers3,
  [PROJECT_ICON.ROCKET]: Rocket,
  [PROJECT_ICON.CODE]: Code2,
  [PROJECT_ICON.PALETTE]: Palette,
  [PROJECT_ICON.MEGAPHONE]: Megaphone,
  [PROJECT_ICON.BOOK]: BookOpen,
})

export function ProjectIcon({ iconKey = PROJECT_ICON.LAYERS, size = 17, strokeWidth = 1.75 }) {
  const Icon = ICON_COMPONENT[iconKey] ?? ICON_COMPONENT[PROJECT_ICON.LAYERS]
  return <Icon aria-hidden="true" size={size} strokeWidth={strokeWidth} />
}
