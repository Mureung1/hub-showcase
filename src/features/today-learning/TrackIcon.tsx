import type { IconType } from 'react-icons'
import { LuBookOpen } from 'react-icons/lu'
import { SiDocker, SiGit, SiReact } from 'react-icons/si'

const trackIcons: Record<string, IconType> = {
  'git-lab': SiGit,
  'react-practice': SiReact,
  'docker-practice': SiDocker,
}

interface TrackIconProps {
  trackId: string
}

export function TrackIcon({ trackId }: TrackIconProps) {
  const Icon = trackIcons[trackId] ?? LuBookOpen
  const iconKey = trackIcons[trackId] ? trackId : 'default'

  return <Icon aria-hidden="true" data-track-icon={iconKey} focusable="false" />
}
