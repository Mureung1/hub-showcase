import { useContext } from 'react'

import { TeamFlowContext } from './TeamFlowContext.js'

export function useTeamFlow() {
  const context = useContext(TeamFlowContext)
  if (!context) throw new Error('useTeamFlow must be used inside TeamFlowProvider')
  return context
}
