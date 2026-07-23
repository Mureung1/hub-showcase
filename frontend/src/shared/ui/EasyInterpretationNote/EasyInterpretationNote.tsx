import type { ReactNode } from 'react'

import { NoteBox, NoteLabel, NoteText } from './EasyInterpretationNote.styles'

interface EasyInterpretationNoteProps {
  label?: string
  children: ReactNode
}

export const EasyInterpretationNote = ({ label = '쉬운 해석', children }: EasyInterpretationNoteProps) => (
  <NoteBox>
    <NoteText>
      <NoteLabel>{label} · </NoteLabel>
      {children}
    </NoteText>
  </NoteBox>
)
