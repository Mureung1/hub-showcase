import MechanismViewer from '../../features/organicMechanism/components/MechanismViewer'
import { sn2Reaction } from '../../features/organicMechanism/data/sn2'
import { sn1Reaction } from '../../features/organicMechanism/data/sn1'
import { e2EliminationReaction } from '../../features/organicMechanism/data/e2Elimination'

export default function SubstitutionEliminationPage() {
  return (
    <MechanismViewer
      title="치환·제거 반응"
      reactions={[sn2Reaction, sn1Reaction, e2EliminationReaction]}
    />
  )
}
