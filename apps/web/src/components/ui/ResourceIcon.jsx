import FileText from 'lucide-react/dist/esm/icons/file-text.mjs'
import Folder from 'lucide-react/dist/esm/icons/folder.mjs'
import Image from 'lucide-react/dist/esm/icons/image.mjs'
import Link2 from 'lucide-react/dist/esm/icons/link-2.mjs'
import { RESOURCE_TYPE } from '@teamflow/shared'

import styles from './ui.module.css'

const iconByType = {
  [RESOURCE_TYPE.FOLDER]: Folder,
  [RESOURCE_TYPE.DOCUMENT]: FileText,
  [RESOURCE_TYPE.LINK]: Link2,
  [RESOURCE_TYPE.IMAGE]: Image,
}

export function ResourceIcon({ type }) {
  const Icon = iconByType[type] ?? FileText
  return <span className={`${styles.resourceIcon} ${styles[`resourceIcon_${type}`]}`}><Icon size={14} /></span>
}
