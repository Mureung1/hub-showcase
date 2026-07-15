import type { ReactElement } from 'react';

export type ChipIconName =
  | 'battery'
  | 'eye'
  | 'moon'
  | 'stomach'
  | 'hair'
  | 'joint'
  | 'shield'
  | 'droplet'
  | 'zigzag'
  | 'briefcase'
  | 'glass'
  | 'smoke'
  | 'heart'
  | 'leaf'
  | 'dumbbell'
  | 'warning'
  | 'check'
  | 'certificate';

const ICON_PATHS: Record<ChipIconName, () => ReactElement> = {
  battery: () => (
    <>
      <rect x="2" y="7" width="17" height="10" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <rect x="20" y="10" width="2" height="4" rx="1" fill="currentColor" />
      <rect x="5" y="10" width="7" height="4" rx="1" fill="currentColor" />
    </>
  ),
  eye: () => (
    <>
      <path
        d="M2 12C2 12 6.5 6 12 6C17.5 6 22 12 22 12C22 12 17.5 18 12 18C6.5 18 2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </>
  ),
  moon: () => <path d="M20 13.5A8.5 8.5 0 1 1 11.5 4.5 7 7 0 0 0 20 13.5Z" fill="currentColor" />,
  stomach: () => (
    <>
      <circle cx="12" cy="13" r="7.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8.5 12.5C9.5 11 10.5 11 11.5 12.5C12.5 14 13.5 14 14.5 12.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
  hair: () => (
    <path
      d="M8 4v11M12 3v13M16 4v10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.9"
    />
  ),
  joint: () => (
    <>
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="17" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M9.5 9.5L14.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  shield: () => (
    <path
      d="M12 3L19 6V11C19 16 16 19.5 12 21C8 19.5 5 16 5 11V6L12 3Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
  droplet: () => (
    <path
      d="M12 3C12 3 5.5 11.5 5.5 15.5C5.5 19 8.5 21.5 12 21.5C15.5 21.5 18.5 19 18.5 15.5C18.5 11.5 12 3 12 3Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
  zigzag: () => (
    <path
      d="M2 9H5.5L7.5 14L10.5 5L13.5 14L15.5 9H22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  briefcase: () => (
    <>
      <rect x="2.5" y="8" width="19" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8.5 8V5.5C8.5 4.7 9.2 4 10 4H14C14.8 4 15.5 4.7 15.5 5.5V8"
        stroke="currentColor"
        strokeWidth="2"
      />
    </>
  ),
  glass: () => (
    <>
      <path
        d="M6 3H18L16 13C15.6 15.8 14 17.5 12 17.5C10 17.5 8.4 15.8 8 13L6 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 17.5V21M8.5 21H15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  smoke: () => (
    <>
      <rect x="2.5" y="14" width="15" height="4" rx="1.2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M19 10.5C20 9.5 20 8.2 19 7M21.5 8.5C22.5 7.5 22.5 6.2 21.5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  ),
  heart: () => (
    <path
      d="M12 20.5S3.5 15 3.5 9C3.5 6 5.8 3.8 8.5 3.8C10 3.8 11.3 4.5 12 5.6C12.7 4.5 14 3.8 15.5 3.8C18.2 3.8 20.5 6 20.5 9C20.5 15 12 20.5 12 20.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  ),
  leaf: () => (
    <>
      <path
        d="M4 20C12 20 18 14 20 4C10 6 4 12 4 20Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M4 20L14 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  dumbbell: () => (
    <>
      <rect x="1.5" y="10" width="3" height="4" rx="1" fill="currentColor" />
      <rect x="19.5" y="10" width="3" height="4" rx="1" fill="currentColor" />
      <rect x="4" y="8.5" width="2" height="7" rx="1" fill="currentColor" />
      <rect x="18" y="8.5" width="2" height="7" rx="1" fill="currentColor" />
      <rect x="6" y="11" width="12" height="2" fill="currentColor" />
    </>
  ),
  warning: () => (
    <>
      <path d="M12 3L22 20H2L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 9.5V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </>
  ),
  check: () => (
    <path
      d="M4 12.5L9 17.5L20 6.5"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  certificate: () => (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
};

export function ChipIcon({ name }: { name: ChipIconName }) {
  const Paths = ICON_PATHS[name];
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <Paths />
    </svg>
  );
}

interface ChipColor {
  tint: string;
  accent: string;
}

const CHIP_PALETTE: ChipColor[] = [
  { tint: 'var(--tint-purple)', accent: 'var(--color-primary-dark)' },
  { tint: 'var(--tint-pink)', accent: 'var(--color-accent-pink)' },
  { tint: 'var(--tint-yellow)', accent: '#B8791F' },
  { tint: 'var(--tint-blue)', accent: 'var(--color-accent-blue)' },
  { tint: 'var(--tint-green)', accent: 'var(--color-accent-green)' },
];

export function getChipColor(index: number): ChipColor {
  return CHIP_PALETTE[index % CHIP_PALETTE.length];
}
